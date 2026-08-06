namespace AIGateway.Application.DTOs;
public record ProviderTypeDto(Guid Id, string Name);
public record CreateProviderTypeDto(string Name);