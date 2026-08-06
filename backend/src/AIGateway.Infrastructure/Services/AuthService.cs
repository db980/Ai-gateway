using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using AIGateway.Application.DTOs;
using AIGateway.Application.Interfaces;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
namespace AIGateway.Infrastructure.Services;
public class AuthService : IAuthService
{
    private readonly IUnitOfWork _uow;
    private readonly IConfiguration _configuration;
    public AuthService(IUnitOfWork uow, IConfiguration configuration) { _uow = uow; _configuration = configuration; }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = await _uow.Repository<User>().Query().FirstOrDefaultAsync(u => u.Email == loginDto.Email);
        if (user == null || !VerifyPassword(loginDto.Password, user.PasswordHash)) throw new UnauthorizedAccessException("Invalid credentials");
        if (!user.IsActive) throw new UnauthorizedAccessException("Account is disabled");
        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        if (await _uow.Repository<User>().Query().AnyAsync(u => u.Email == registerDto.Email)) throw new InvalidOperationException("Email already registered");
        var user = new User { Email = registerDto.Email, Username = registerDto.Username, PasswordHash = HashPassword(registerDto.Password) };
        await _uow.Repository<User>().AddAsync(user);
        await _uow.SaveChangesAsync();
        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        var token = await _uow.Repository<RefreshToken>().Query().FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);
        if (token == null || token.ExpiresAt < DateTime.UtcNow) throw new UnauthorizedAccessException("Invalid or expired refresh token");
        token.IsRevoked = true;
        var user = await _uow.Repository<User>().GetByIdAsync(token.UserId);
        if (user == null) throw new UnauthorizedAccessException("User not found");
        await _uow.SaveChangesAsync();
        return await GenerateAuthResponseAsync(user);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken)
    {
        var token = await _uow.Repository<RefreshToken>().Query().FirstOrDefaultAsync(rt => rt.Token == refreshToken);
        if (token == null) return false;
        token.IsRevoked = true;
        await _uow.SaveChangesAsync();
        return true;
    }

    public Task ForgotPasswordAsync(string email) { return Task.CompletedTask; }
    public Task ResetPasswordAsync(string email, string token, string newPassword) { return Task.CompletedTask; }

    private async Task<AuthResponseDto> GenerateAuthResponseAsync(User user)
    {
        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiresAt = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryMinutes"] ?? "60"));
        await _uow.Repository<RefreshToken>().AddAsync(new RefreshToken { UserId = user.Id, Token = refreshToken, ExpiresAt = DateTime.UtcNow.AddDays(7) });
        await _uow.SaveChangesAsync();
        return new AuthResponseDto(token, refreshToken, expiresAt, new UserDto(user.Id, user.Email, user.Username, user.Role.ToString(), user.Plan.ToString(), user.Credits));
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "DefaultSuperSecretKeyForDev12345678!"));
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Email, user.Email), new Claim(ClaimTypes.Role, user.Role.ToString()), new Claim("username", user.Username) };
        var token = new JwtSecurityToken(_configuration["Jwt:Issuer"], _configuration["Jwt:Audience"], claims, expires: DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryMinutes"] ?? "60")), signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
    private static string HashPassword(string password) { var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password)); return Convert.ToHexString(bytes); }
    private static bool VerifyPassword(string password, string hash) => HashPassword(password) == hash;
}
