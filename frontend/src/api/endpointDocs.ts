export interface EndpointDoc {
  id: string;
  group: string;
  method: string;
  path: string;
  title: string;
  description: string;
  auth: string;
  roles: string[];
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  responseBody: string;
  exampleRequest?: string;
  exampleResponse?: string;
  relatedEndpoint?: string;
}

export const endpointDocs: EndpointDoc[] = [
  {
    id: 'auth-login', group: 'Authentication', method: 'POST', path: '/api/auth/login',
    title: 'Login', description: 'Authenticate with email and password to receive a JWT token.',
    auth: 'None', roles: ['*'],
    requestBody: `{\n  "email": "admin@aigw.com",\n  "password": "Admin123!"\n}`,
    responseBody: `{\n  "token": "eyJhbGci...",\n  "refreshToken": "dGhpcyBp...",\n  "expiresAt": "2026-07-30T12:00:00Z",\n  "user": {\n    "id": "guid",\n    "email": "admin@aigw.com",\n    "username": "admin",\n    "role": "SuperAdmin",\n    "plan": "Enterprise",\n    "credits": 10000\n  }\n}`,
    exampleRequest: `curl -X POST http://localhost:5000/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"admin@aigw.com","password":"Admin123!"}'`,
    exampleResponse: `{\n  "token": "eyJhbGciOiJIUzI1NiIs...",\n  "refreshToken": "Y2xpZW50X2lk...",\n  "expiresAt": "2026-07-30T12:00:00Z",\n  "user": {\n    "id": "a1b2c3d4-...",\n    "email": "admin@aigw.com",\n    "username": "admin",\n    "role": "SuperAdmin",\n    "plan": "Enterprise",\n    "credits": 10000\n  }\n}`,
  },
  {
    id: 'auth-register', group: 'Authentication', method: 'POST', path: '/api/auth/register',
    title: 'Register', description: 'Create a new user account.',
    auth: 'None', roles: ['*'],
    requestBody: `{\n  "email": "user@example.com",\n  "username": "newuser",\n  "password": "SecurePass123!"\n}`,
    responseBody: `{\n  "token": "eyJhbGci...",\n  "refreshToken": "dGhpcyBp...",\n  "expiresAt": "2026-07-30T12:00:00Z",\n  "user": { ... }\n}`,
  },
  {
    id: 'auth-profile', group: 'Authentication', method: 'GET', path: '/api/auth/profile',
    title: 'Get Profile', description: 'Retrieve the currently authenticated user profile.',
    auth: 'JWT Bearer', roles: ['*'],
    responseBody: `{\n  "id": "guid",\n  "email": "admin@aigw.com",\n  "username": "admin",\n  "role": "SuperAdmin",\n  "plan": "Enterprise",\n  "credits": 10000\n}`,
  },
  {
    id: 'auth-refresh', group: 'Authentication', method: 'POST', path: '/api/auth/refresh',
    title: 'Refresh Token', description: 'Exchange a refresh token for a new JWT token pair.',
    auth: 'None', roles: ['*'],
    requestBody: `{\n  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4="\n}`,
    responseBody: `{\n  "token": "eyJhbGci...",\n  "refreshToken": "bmV3IHJlZnJlc2g...",\n  "expiresAt": "2026-07-30T13:00:00Z"\n}`,
  },
  {
    id: 'providers-list', group: 'Providers', method: 'GET', path: '/api/providers',
    title: 'List Providers', description: 'Get all AI providers with their associated models.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin', 'User'],
    queryParams: [{ name: 'includeModels', type: 'boolean', required: false, description: 'Include nested models array' }],
    responseBody: `[\n  {\n    "id": "guid",\n    "name": "OpenAI",\n    "type": "OpenAI",\n    "baseUrl": "https://api.openai.com/v1",\n    "isActive": true,\n    "priority": 1,\n    "models": [\n      { "id": "guid", "name": "gpt-4o", "isFree": false, "providerName": "OpenAI" }\n    ]\n  }\n]`,
    exampleResponse: `[\n  {\n    "id": "p001",\n    "name": "OpenAI",\n    "type": "OpenAI",\n    "baseUrl": "https://api.openai.com/v1",\n    "isActive": true,\n    "priority": 1,\n    "rateLimit": 1000,\n    "createdAt": "2026-01-15T08:00:00Z",\n    "models": [\n      { "id": "m001", "name": "gpt-4o", "displayName": "GPT-4o", "isFree": false, "providerName": "OpenAI", "supportsStreaming": true }\n    ]\n  }\n]`,
  },
  {
    id: 'providers-create', group: 'Providers', method: 'POST', path: '/api/providers',
    title: 'Create Provider', description: 'Add a new AI provider configuration.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    requestBody: `{\n  "name": "MyProvider",\n  "type": "OpenAI",\n  "baseUrl": "https://api.example.com/v1",\n  "apiKey": "sk-...",\n  "organization": "org-...",\n  "rateLimit": 100,\n  "timeout": 30,\n  "isActive": true,\n  "priority": 5,\n  "models": [\n    { "name": "my-model", "isFree": true, "supportsStreaming": true }\n  ]\n}`,
    responseBody: `{ "id": "guid", "name": "MyProvider", ... }`,
  },
  {
    id: 'providers-update', group: 'Providers', method: 'PUT', path: '/api/providers/{id}',
    title: 'Update Provider', description: 'Update an existing provider configuration. Can include models to add and removeModelIds to delete.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    requestBody: `{\n  "name": "Updated Provider",\n  "baseUrl": "https://api.newurl.com/v1",\n  "isActive": false,\n  "models": [ { "name": "new-model", "isFree": true } ],\n  "removeModelIds": ["guid1", "guid2"]\n}`,
    responseBody: `{ "id": "guid", "name": "Updated Provider", ... }`,
  },
  {
    id: 'models-list', group: 'Models', method: 'GET', path: '/api/models',
    title: 'List Models', description: 'Get all AI models across all providers, or filter by provider.',
    auth: 'JWT Bearer', roles: ['*'],
    queryParams: [{ name: 'providerId', type: 'guid', required: false, description: 'Filter models by provider ID' }],
    responseBody: `[\n  {\n    "id": "guid",\n    "name": "gpt-4o",\n    "displayName": "GPT-4o",\n    "providerId": "guid",\n    "providerName": "OpenAI",\n    "isFree": false,\n    "supportsStreaming": true,\n    "contextWindow": 128000\n  }\n]`,
    exampleResponse: `[\n  {\n    "id": "m001",\n    "name": "gpt-4o",\n    "displayName": "GPT-4o",\n    "actualModelName": "gpt-4o-2024-08-06",\n    "providerId": "p001",\n    "providerName": "OpenAI",\n    "isFree": false,\n    "supportsStreaming": true,\n    "contextWindow": 128000,\n    "status": "Active"\n  }\n]`,
  },
  {
    id: 'models-create', group: 'Models', method: 'POST', path: '/api/models',
    title: 'Create Model', description: 'Add a new model to a provider.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    requestBody: `{\n  "name": "gpt-4o-mini",\n  "displayName": "GPT-4o Mini",\n  "providerId": "guid",\n  "isFree": true,\n  "contextWindow": 128000,\n  "supportsStreaming": true\n}`,
    responseBody: `{ "id": "guid", "name": "gpt-4o-mini", ... }`,
  },
  {
    id: 'models-update', group: 'Models', method: 'PUT', path: '/api/models/{id}',
    title: 'Update Model', description: 'Update model properties, including name, status, or free/paid flag.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    requestBody: `{\n  "name": "gpt-4o-updated",\n  "displayName": "GPT-4o Updated",\n  "isFree": true,\n  "status": "Active"\n}`,
    responseBody: `{ "id": "guid", "name": "gpt-4o-updated", ... }`,
  },
  {
    id: 'apikeys-list', group: 'API Keys', method: 'GET', path: '/api/apikeys',
    title: 'List API Keys', description: 'Retrieve all API keys for the current user.',
    auth: 'JWT Bearer', roles: ['*'],
    responseBody: `[\n  {\n    "id": "guid",\n    "prefix": "gw_...",\n    "name": "My Key",\n    "status": "Active",\n    "usedTokens": 15000,\n    "createdAt": "2026-06-01T00:00:00Z"\n  }\n]`,
  },
  {
    id: 'apikeys-create', group: 'API Keys', method: 'POST', path: '/api/apikeys',
    title: 'Create API Key', description: 'Generate a new API key for gateway access.',
    auth: 'JWT Bearer', roles: ['*'],
    requestBody: `{\n  "name": "My Development Key",\n  "expiresAt": "2027-01-01T00:00:00Z",\n  "rateLimit": 100,\n  "quota": 1000000\n}`,
    responseBody: `{\n  "id": "guid",\n  "key": "gw_abc123...",\n  "prefix": "gw_abc",\n  "name": "My Development Key",\n  "status": "Active",\n  "expiresAt": "2027-01-01T00:00:00Z"\n}`,
  },
  {
    id: 'usage-summary', group: 'Usage', method: 'GET', path: '/api/usage/summary',
    title: 'Usage Summary', description: 'Get aggregated usage statistics including request counts, tokens, and cost.',
    auth: 'JWT Bearer', roles: ['*'],
    responseBody: `{\n  "totalRequests": 15420,\n  "todayRequests": 234,\n  "totalTokens": 5200000,\n  "promptTokens": 3100000,\n  "completionTokens": 2100000,\n  "totalCost": 45.67,\n  "errors": 23,\n  "activeApiKeys": 5\n}`,
  },
  {
    id: 'usage-charts', group: 'Usage', method: 'GET', path: '/api/usage/charts',
    title: 'Usage Charts', description: 'Get daily usage data for charting.',
    auth: 'JWT Bearer', roles: ['*'],
    queryParams: [{ name: 'days', type: 'integer', required: false, description: 'Number of days to return (default: 30)' }],
    responseBody: `[\n  {\n    "date": "2026-07-01T00:00:00Z",\n    "requestCount": 520,\n    "tokenCount": 180000,\n    "cost": 1.45\n  }\n]`,
  },
  {
    id: 'analytics-overview', group: 'Analytics', method: 'GET', path: '/api/analytics/overview',
    title: 'Analytics Overview', description: 'Get high-level platform analytics including total users, revenue, and averages.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    responseBody: `{\n  "totalRequests": 15420,\n  "totalUsers": 42,\n  "totalTokens": 5200000,\n  "totalRevenue": 456.78,\n  "avgResponseTime": 1240\n}`,
  },
  {
    id: 'billing-invoices', group: 'Billing', method: 'GET', path: '/api/billing/invoices',
    title: 'List Invoices', description: 'Retrieve all invoices for the current user.',
    auth: 'JWT Bearer', roles: ['*'],
    responseBody: `[\n  {\n    "id": "guid",\n    "invoiceNumber": "INV-2026-0001",\n    "amount": 49.99,\n    "status": "Paid",\n    "createdAt": "2026-07-01T00:00:00Z"\n  }\n]`,
  },
  {
    id: 'prompttemplates-list', group: 'Prompt Templates', method: 'GET', path: '/api/prompttemplates',
    title: 'List Templates', description: 'Get all saved prompt templates.',
    auth: 'JWT Bearer', roles: ['*'],
    responseBody: `[\n  {\n    "id": "guid",\n    "name": "Code Review",\n    "content": "Review this code for bugs...",\n    "category": "Development",\n    "isFavorite": true,\n    "isPublic": false,\n    "createdAt": "2026-06-15T00:00:00Z"\n  }\n]`,
  },
  {
    id: 'prompttemplates-create', group: 'Prompt Templates', method: 'POST', path: '/api/prompttemplates',
    title: 'Create Template', description: 'Save a new prompt template.',
    auth: 'JWT Bearer', roles: ['*'],
    requestBody: `{\n  "name": "Bug Analysis",\n  "content": "Analyze this error trace...",\n  "category": "Debugging",\n  "isPublic": false\n}`,
    responseBody: `{ "id": "guid", "name": "Bug Analysis", ... }`,
  },
  {
    id: 'gateway-chat', group: 'Chat / Gateway', method: 'POST', path: '/gateway/chat/completions',
    title: 'Chat Completions', description: 'Send a chat message to an AI model through the gateway. Supports streaming (SSE) and non-streaming modes.',
    auth: 'JWT Bearer or API Key', roles: ['*'],
    relatedEndpoint: 'playground',
    requestBody: `{\n  "model": "gpt-4o",\n  "messages": [\n    { "role": "system", "content": "You are a helpful assistant." },\n    { "role": "user", "content": "Hello!" }\n  ],\n  "stream": false,\n  "settings": {\n    "temperature": 0.7,\n    "topP": 1,\n    "maxTokens": 4096\n  }\n}`,
    responseBody: `{\n  "model": "gpt-4o",\n  "content": "Hello! How can I assist you today?",\n  "usage": {\n    "promptTokens": 25,\n    "completionTokens": 12,\n    "totalTokens": 37\n  },\n  "latencyMs": 850\n}\n\n// Streaming mode returns SSE events:\n// data: {"content":"Hello"}\n// data: {"content":"!"}\n// data: [DONE]`,
    exampleRequest: `curl -X POST http://localhost:5000/gateway/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer eyJhbGci..." \\\n  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}],"stream":false}'`,
    exampleResponse: `{\n  "model": "gpt-4o",\n  "content": "Hello! How can I help you today?",\n  "usage": { "promptTokens": 10, "completionTokens": 8, "totalTokens": 18 },\n  "latencyMs": 620\n}`,
  },
  {
    id: 'admin-users', group: 'Admin', method: 'GET', path: '/api/admin/users',
    title: 'List Users', description: 'Get all registered users (admin only).',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    responseBody: `[\n  {\n    "id": "guid",\n    "email": "user@example.com",\n    "username": "johndoe",\n    "role": "User",\n    "plan": "Free",\n    "isActive": true,\n    "credits": 500,\n    "createdAt": "2026-01-01T00:00:00Z"\n  }\n]`,
  },
  {
    id: 'admin-update-role', group: 'Admin', method: 'PUT', path: '/api/admin/users/{id}/role',
    title: 'Update User Role', description: 'Change a user role (admin only).',
    auth: 'JWT Bearer', roles: ['SuperAdmin'],
    requestBody: `{\n  "userId": "guid",\n  "role": "Admin"\n}`,
    responseBody: `{ "message": "Role updated successfully" }`,
  },
  {
    id: 'settings-list', group: 'Settings', method: 'GET', path: '/api/settings',
    title: 'List Settings', description: 'Get all system settings.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    responseBody: `[\n  { "key": "siteName", "value": "AI Gateway", "description": "Site display name" }\n]`,
  },
  {
    id: 'settings-update', group: 'Settings', method: 'PUT', path: '/api/settings/{key}',
    title: 'Update Setting', description: 'Update a system setting by key.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    requestBody: `{\n  "value": "AI Gateway Pro"\n}`,
    responseBody: `{ "key": "siteName", "value": "AI Gateway Pro" }`,
  },
  {
    id: 'logs-list', group: 'Logs', method: 'GET', path: '/api/logs',
    title: 'List Audit Logs', description: 'Get paginated audit log entries.',
    auth: 'JWT Bearer', roles: ['SuperAdmin', 'Admin'],
    queryParams: [
      { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
      { name: 'pageSize', type: 'integer', required: false, description: 'Items per page (default: 50)' },
    ],
    responseBody: `[\n  {\n    "id": "guid",\n    "userEmail": "admin@aigw.com",\n    "action": "User.Login",\n    "entity": "User",\n    "createdAt": "2026-07-29T12:00:00Z"\n  }\n]`,
  },
];
