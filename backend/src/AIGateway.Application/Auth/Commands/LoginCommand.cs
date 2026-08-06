using MediatR;
using AIGateway.Application.DTOs;
using AIGateway.Application.Interfaces;
namespace AIGateway.Application.Auth.Commands;
public record LoginCommand(string Email, string Password) : IRequest<AuthResponseDto>;
public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private readonly IAuthService _authService;
    public LoginCommandHandler(IAuthService authService) { _authService = authService; }
    public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken ct) => await _authService.LoginAsync(new LoginDto(request.Email, request.Password));
}
