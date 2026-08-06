namespace AIGateway.Application.DTOs;
public record AnalyticsOverviewDto(long TotalRequests, long TotalUsers, long TotalTokens, decimal TotalRevenue, double AvgResponseTime);
public record TopModelDto(string ModelName, long RequestCount, long TokenCount);
public record TopUserDto(string Username, string Email, long RequestCount, long TokenCount);
