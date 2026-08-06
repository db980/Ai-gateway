using MediatR;
using AIGateway.Application.DTOs;
using AIGateway.Application.Interfaces;

namespace AIGateway.Application.Auth.Commands;

public record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResponseDto>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IAuthService _authService;
    public RefreshTokenCommandHandler(IAuthService authService) { _authService = authService; }
    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken ct) => await _authService.RefreshTokenAsync(request.RefreshToken);
}
