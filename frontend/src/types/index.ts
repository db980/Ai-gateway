export interface User { id: string; email: string; username: string; role: 'SuperAdmin' | 'Admin' | 'User'; plan: string; credits: number; }
export interface AuthResponse { token: string; refreshToken: string; expiresAt: string; user: User; }
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; username: string; password: string; }
export interface ModelItem { name: string; displayName?: string; actualModelName?: string; isFree: boolean; contextWindow?: number; maxTokens?: number; supportsStreaming?: boolean; supportsImages?: boolean; supportsVision?: boolean; }
export interface Provider { id: string; name: string; type: string; baseUrl: string; isActive: boolean; priority: number; rateLimit?: number; createdAt: string; apiKeyExpiresAt?: string; models?: AIModel[]; chatEndpointPath?: string; apiKeys?: ProviderApiKey[]; }
export interface ProviderApiKey { id: string; keyValue: string; name?: string; expiresAt?: string; isActive: boolean; createdAt: string; }
export interface AddProviderKeyRequest { keyValue: string; name?: string; expiresAt?: string; isActive?: boolean; }
export interface CreateProviderRequest { name: string; baseUrl: string; apiKey?: string; apiKeyExpiresAt?: string; organization?: string; rateLimit?: number; timeout?: number; isActive?: boolean; priority?: number; models?: ModelItem[]; headers?: string; authType?: string; type?: string; bodyTemplate?: string; responseTemplate?: string; errorTemplate?: string; chatEndpointPath?: string; apiKeys?: AddProviderKeyRequest[]; }
export interface UpdateProviderRequest { name?: string; type?: string; baseUrl?: string; apiKey?: string; apiKeyExpiresAt?: string; organization?: string; rateLimit?: number; timeout?: number; isActive?: boolean; priority?: number; headers?: string; authType?: string; bodyTemplate?: string; responseTemplate?: string; errorTemplate?: string; models?: ModelItem[]; removeModelIds?: string[]; chatEndpointPath?: string; }
export interface AIModel { id: string; name: string; displayName?: string; actualModelName?: string; alternativeModelName?: string; location?: string; providerId: string; providerName: string; contextWindow?: number; maxTokens?: number; supportsStreaming: boolean; supportsImages?: boolean; supportsVision?: boolean; supportsAudio?: boolean; supportsFunctionCalling?: boolean; status: string; isFree: boolean; tpmLimit?: number; tpdLimit?: number; rpmLimit?: number; maxConcurrency?: number; pricePer1kInput?: number; pricePer1kOutput?: number; }
export interface CreateModelRequest { name: string; displayName?: string; actualModelName?: string; providerId: string; contextWindow?: number; maxTokens?: number; supportsImages?: boolean; supportsVision?: boolean; supportsAudio?: boolean; supportsFunctionCalling?: boolean; supportsStreaming?: boolean; isFree?: boolean; tpmLimit?: number; tpdLimit?: number; rpmLimit?: number; maxConcurrency?: number; pricePer1kInput?: number; pricePer1kOutput?: number; }
export interface UpdateModelRequest { name?: string; displayName?: string; actualModelName?: string; contextWindow?: number; maxTokens?: number; supportsImages?: boolean; supportsVision?: boolean; supportsStreaming?: boolean; isFree?: boolean; status?: string; tpmLimit?: number; tpdLimit?: number; rpmLimit?: number; maxConcurrency?: number; pricePer1kInput?: number; pricePer1kOutput?: number; }
export interface BulkPricingRequest { pricePer1kInput?: number; pricePer1kOutput?: number; includeFree?: boolean; }
export interface ApiKey { id: string; prefix: string; name?: string; status: string; expiresAt?: string; usedTokens: number; createdAt: string; cost?: number; restrictToActiveModels?: boolean; allowedModelIds?: string; }
export interface ApiKeyFull extends ApiKey { key: string; ipWhitelist?: string; rateLimit?: number; quota?: number; }
export interface CreateApiKeyRequest { name?: string; expiresAt?: string; ipWhitelist?: string; rateLimit?: number; quota?: number; restrictToActiveModels?: boolean; }
export interface UsageSummary { totalRequests: number; todayRequests: number; totalTokens: number; promptTokens: number; completionTokens: number; totalCost: number; errors: number; activeApiKeys: number; }
export interface UsageChart { date: string; requestCount: number; tokenCount: number; cost: number; promptTokens?: number; completionTokens?: number; errors?: number; avgLatencyMs?: number; }
export interface UsageRecord { id: string; modelName: string | null; providerName: string | null; promptTokens: number; completionTokens: number; totalTokens: number; cost: number | null; latencyMs: number | null; isSuccess: boolean; errorMessage: string | null; requestContent: string | null; responseContent: string | null; ipAddress: string | null; requestSize: number | null; responseSize: number | null; createdAt: string; }
export interface ChatToolCall { id?: string; name?: string; arguments?: string; }
export interface ChatMessage { role: 'user' | 'assistant' | 'system' | 'tool'; content: string; reasoning?: string; toolCalls?: ChatToolCall[]; }
export interface ChatRequest { model: string; messages: ChatMessage[]; stream?: boolean; settings?: ChatSettings; }
export interface ChatSettings { temperature?: number; topP?: number; frequencyPenalty?: number; presencePenalty?: number; maxTokens?: number; stopSequence?: string; jsonMode?: boolean; enableThinking?: boolean; }
export interface StreamEvent { content?: string; reasoning?: string; toolCalls?: ChatToolCall[]; }
export interface PromptTemplate { id: string; name: string; content: string; category?: string; tags?: string; isFavorite: boolean; isPublic: boolean; createdAt: string; }
export interface CreatePromptTemplateRequest { name: string; content: string; category?: string; tags?: string; isPublic?: boolean; }
export interface Plan { name: string; price: number; billingCycle: string; tokensIncluded: number; features: string[]; maxRequestsPerDay: number; isPaid: boolean; }
export interface BillingSummary { currentPlan: string; credits: number; gateway: string; totalSpent: number; nextBillingDate?: string; }
export interface Invoice { id: string; invoiceNumber: string; plan: string; amount: number; currency: string; status: string; gatewayRef?: string; createdAt: string; paidAt?: string; }
export interface CheckoutRequest { plan: string; cardToken: string; cardHolder?: string; }
export interface CheckoutResult { success: boolean; newPlan?: string; amount?: number; transactionId?: string; invoice?: Invoice; errorMessage?: string; }
export interface CancelResult { success: boolean; message: string; }
export interface AnalyticsOverview { totalRequests: number; totalUsers: number; totalTokens: number; totalRevenue: number; avgResponseTime: number; }
export interface AdminUser { id: string; email: string; username: string; role: string; plan: string; isActive: boolean; credits: number; createdAt: string; }
export interface TestResult { success: boolean; message: string; latencyMs: number; response?: string; status?: string; }
export interface BulkModelTestItem { modelId: string; modelName: string; providerName?: string; success: boolean; message: string; latencyMs: number; status: string; response?: string; }
export interface ProviderType { id: string; name: string; }
export interface CreateProviderTypeRequest { name: string; }
export interface Setting { key: string; value: string; description?: string; }
export interface AuditLog { id: string; userEmail?: string; action: string; entity?: string; createdAt: string; }
