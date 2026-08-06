using AIGateway.Domain.Enums;
namespace AIGateway.Application.DTOs;
public record UpdateUserRoleDto(Guid UserId, UserRole Role);
public record AdminUserDto(Guid Id, string Email, string Username, string Role, string Plan, bool IsActive, decimal Credits, DateTime CreatedAt);
