using Microsoft.EntityFrameworkCore;
using AIGateway.Domain.Entities;
namespace AIGateway.Persistence.Data;
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Provider> Providers => Set<Provider>();
    public DbSet<ProviderApiKey> ProviderApiKeys => Set<ProviderApiKey>();
    public DbSet<AIModel> AIModels => Set<AIModel>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<UsageRecord> UsageRecords => Set<UsageRecord>();
    public DbSet<PromptTemplate> PromptTemplates => Set<PromptTemplate>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<ProviderType> ProviderTypes => Set<ProviderType>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.Username).HasMaxLength(100);
            e.Property(x => x.PasswordHash).HasMaxLength(500);
            e.Property(x => x.Credits).HasPrecision(18, 4);
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(50);
            e.Property(x => x.Plan).HasConversion<string>().HasMaxLength(50);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Token);
            e.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Provider>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Name);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.BaseUrl).HasMaxLength(500);
            e.Property(x => x.ApiKey).HasMaxLength(500);
            e.Property(x => x.ApiKeyExpiresAt);
            e.Property(x => x.ChatEndpointPath).HasMaxLength(200).HasDefaultValue("chat/completions");
            e.Property(x => x.Type).HasMaxLength(50);
            e.Property(x => x.Priority);
            e.Property(x => x.RateLimit);
            e.Property(x => x.Timeout);
        });

        modelBuilder.Entity<ProviderApiKey>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.ProviderId);
            e.Property(x => x.KeyValue).HasMaxLength(500);
            e.Property(x => x.Name).HasMaxLength(200);
            e.HasOne(x => x.Provider).WithMany(x => x.ApiKeys).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProviderType>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<AIModel>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Name);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.DisplayName).HasMaxLength(200);
            e.Property(x => x.ActualModelName).HasMaxLength(200);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(50);
            e.Property(x => x.PricePerPromptToken).HasPrecision(18, 8);
            e.Property(x => x.PricePerCompletionToken).HasPrecision(18, 8);
            e.HasOne(x => x.Provider).WithMany(x => x.Models).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ApiKey>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Key).HasMaxLength(500);
            e.Property(x => x.Prefix).HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(50);
            e.HasOne(x => x.User).WithMany(x => x.ApiKeys).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UsageRecord>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Cost).HasPrecision(18, 8);
            e.HasOne(x => x.User).WithMany(x => x.UsageRecords).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.ApiKey).WithMany().HasForeignKey(x => x.ApiKeyId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PromptTemplate>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Category).HasMaxLength(100);
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.InvoiceNumber).HasMaxLength(100);
            e.Property(x => x.Amount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Action).HasMaxLength(200);
        });

        modelBuilder.Entity<Setting>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Key).HasMaxLength(200);
        });
    }
}
