namespace AIGateway.Application.DTOs;
public record CreatePromptTemplateDto(string Name, string Content, string? Category, string? Tags, bool IsPublic = false);
public record PromptTemplateDto(Guid Id, string Name, string Content, string? Category, string? Tags, bool IsFavorite, bool IsPublic, DateTime CreatedAt);
