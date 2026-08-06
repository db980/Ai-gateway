namespace AIGateway.Application.DTOs;
public record AuditLogDto(Guid Id, string? UserEmail, string Action, string? Entity, DateTime CreatedAt);
