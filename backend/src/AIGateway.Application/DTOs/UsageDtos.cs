namespace AIGateway.Application.DTOs;
public record UsageSummaryDto(long TotalRequests, long TodayRequests, long TotalTokens, long PromptTokens, long CompletionTokens, decimal TotalCost, long Errors, long ActiveApiKeys);
public record UsageChartDto(DateTime Date, long RequestCount, long TokenCount, decimal Cost, long PromptTokens, long CompletionTokens, long Errors, double AvgLatencyMs);
public record ProviderUsageDto(string ProviderName, long RequestCount, long TokenCount, decimal Cost);
public record UsageRecordDto(Guid Id, string? ModelName, string? ProviderName, long PromptTokens, long CompletionTokens, long TotalTokens, decimal? Cost, long? LatencyMs, bool IsSuccess, string? ErrorMessage, string? RequestContent, string? ResponseContent, string? IpAddress, long? RequestSize, long? ResponseSize, DateTime CreatedAt);
