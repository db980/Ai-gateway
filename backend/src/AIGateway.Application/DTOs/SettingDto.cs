namespace AIGateway.Application.DTOs;
public record SettingDto(string Key, string Value, string? Description);
public record UpdateSettingDto(string Value);
