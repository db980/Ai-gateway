namespace AIGateway.Application.DTOs;
public record LoginDto(string Email, string Password);
public record RegisterDto(string Email, string Username, string Password);
public record AuthResponseDto(string Token, string RefreshToken, DateTime ExpiresAt, UserDto User);
public record UserDto(Guid Id, string Email, string Username, string Role, string Plan, decimal Credits);
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string Email, string Token, string NewPassword);
public record RefreshTokenDto(string RefreshToken);
