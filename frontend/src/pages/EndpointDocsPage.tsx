import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, alpha, Grid, CircularProgress,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CodeIcon from '@mui/icons-material/Code';
import SendIcon from '@mui/icons-material/Send';
import ApiIcon from '@mui/icons-material/Api';
import StorageIcon from '@mui/icons-material/Storage';
import { endpointDocs, EndpointDoc } from '../api/endpointDocs';
import { models as modelsApi, providers as providersApi } from '../api/endpoints';
import type { AIModel, Provider } from '../types';

const methodColor: Record<string, string> = { GET: '#1976d2', POST: '#388e3c', PUT: '#f57c00', DELETE: '#d32f2f' };
const groups = [...new Set(endpointDocs.map(d => d.group))];

const codeExamples: Record<string, { lang: string; label: string; code: (doc: EndpointDoc) => string }> = {
  curl: { lang: 'bash', label: 'cURL', code: (doc) => `curl -X ${doc.method} 'http://localhost:5005${doc.path}' \\\n${doc.auth !== 'None' ? `  -H "Authorization: Bearer <your-token-or-api-key>" \\\n` : ''}  -H "Content-Type: application/json"${doc.requestBody ? ` \\\n  -d '${doc.requestBody.replace(/\n/g, '\\n').replace(/'/g, "'\\''")}'` : ''}` },
  javascript: { lang: 'javascript', label: 'JavaScript', code: (doc) => `fetch('http://localhost:5005${doc.path}', {\n  method: '${doc.method}',\n  headers: {\n    'Content-Type': 'application/json'${doc.auth !== 'None' ? `,\n    'Authorization': 'Bearer <your-token-or-api-key>'` : ''}\n  }${doc.requestBody ? `,\n  body: JSON.stringify(${doc.requestBody})` : ''}\n})\n  .then(res => res.json())\n  .then(console.log);` },
  python: { lang: 'python', label: 'Python', code: (doc) => `import requests\n\nurl = "http://localhost:5005${doc.path}"\nheaders = {\n    "Content-Type": "application/json"${doc.auth !== 'None' ? ',\n    "Authorization": "Bearer <your-token-or-api-key>"' : ''}\n}${doc.requestBody ? `\npayload = ${doc.requestBody?.replace(/\n/g, '\n')}` : ''}\n\nresponse = requests.${doc.method.toLowerCase()}(url, headers=headers${doc.requestBody ? ', json=payload' : ''})\nprint(response.json())` },
};

const CodeBlock = ({ code, label }: { code: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  return (
    <Box sx={{ position: 'relative', '&:hover .copy-btn': { opacity: 1 } }}>
      {label && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem' }}>{label}</Typography>}
      <Box component="pre" sx={{ p: 1.5, borderRadius: 1, bgcolor: '#1a1a2e', color: '#e8e8f0', fontFamily: '"Fira Code","Consolas",monospace', fontSize: '0.75rem', overflow: 'auto', maxHeight: 280, lineHeight: 1.5, m: 0 }}>
        <Box component="span" sx={{ color: '#82aaff' }}>{code}</Box>
      </Box>
      <IconButton className="copy-btn" onClick={copy} size="small" sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity 0.2s', color: '#fff', bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.2) } }}>
        {copied ? <CheckCircleIcon sx={{ fontSize: 14, color: '#69db7c' }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Box>
  );
};

const quickStartTmpl = (modelName: string) => `curl -X POST http://localhost:5005/gateway/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your-api-key>" \\
  -d '{
    "model": "${modelName}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

export const EndpointDocsPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [lang, setLang] = useState('curl');
  const [modelList, setModelList] = useState<AIModel[]>([]);
  const [providerList, setProviderList] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const selectDoc = endpointDocs.find(d => d.id === selected);
  const firstModel = modelList.find(m => m.status === 'Active');
  const quickStartCode = quickStartTmpl(firstModel?.name ?? 'gpt-4o');

  useEffect(() => {
    Promise.all([
      modelsApi.getAll().then(r => setModelList(r.data)).catch(() => {}),
      providersApi.getAll().then(r => setProviderList(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const activeModels = modelList.filter(m => m.status === 'Active');
  const activeProviders = providerList.filter(p => p.isActive);
  const providerModelMap = activeProviders.map(p => {
    const models = activeModels.filter(m => m.providerId === p.id);
    return { ...p, models };
  });

  return (
    <Box>
      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ApiIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>API Documentation</Typography>
            <Typography variant="body2" color="text.secondary">OpenAI-compatible gateway &middot; {activeModels.length} models &middot; {activeProviders.length} providers</Typography>
          </Box>
        </Box>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyIcon color="primary" /> Quick Start &mdash; Use Your API Key
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Generate an API key from the <Chip label="API Keys" size="small" component="a" href="/api-keys" clickable sx={{ cursor: 'pointer' }} /> page, then call the gateway with any active model:
          </Typography>
          <CodeBlock code={quickStartCode} />
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
            <Chip icon={<VpnKeyIcon />} label="Get API Key" size="small" color="primary" variant="outlined" onClick={() => navigate('/api-keys')} sx={{ cursor: 'pointer' }} />
            <Chip icon={<SendIcon />} label="Try in Playground" size="small" color="secondary" variant="outlined" onClick={() => navigate('/playground')} sx={{ cursor: 'pointer' }} />
          </Box>
        </Paper>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {[
            { label: 'OpenAI-compatible /v1 endpoint', icon: <ApiIcon /> },
            { label: 'Bearer token or API Key auth', icon: <VpnKeyIcon /> },
            { label: 'Streaming SSE support', icon: <CodeIcon /> },
          ].map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ color: 'success.main', fontSize: '1rem' }}>{f.icon}</Box>
              <Typography variant="caption" color="text.secondary">{f.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ width: 300, flexShrink: 0 }}>
          <Paper>
            <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Endpoints</Typography>
            </Box>
            {groups.map(group => (
              <Box key={group}>
                <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 1.5, pb: 0.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>{group}</Typography>
                {endpointDocs.filter(d => d.group === group).map(doc => (
                  <Box key={doc.id} onClick={() => setSelected(doc.id === selected ? null : doc.id)} sx={{ px: 2, py: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, bgcolor: selected === doc.id ? 'action.selected' : 'transparent', borderLeft: selected === doc.id ? 3 : 0, borderColor: methodColor[doc.method], '&:hover': { bgcolor: 'action.hover' } }}>
                    <Chip label={doc.method} size="small" sx={{ color: '#fff', bgcolor: methodColor[doc.method] || '#666', minWidth: 44, height: 20, '& .MuiChip-label': { fontSize: '0.6rem', fontWeight: 700 } }} />
                    <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</Typography>
                    {doc.auth !== 'None' ? <LockIcon sx={{ fontSize: 12, color: 'text.disabled' }} /> : <PublicIcon sx={{ fontSize: 12, color: 'success.main' }} />}
                  </Box>
                ))}
              </Box>
            ))}
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {!selectDoc ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ApiIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>Select an Endpoint</Typography>
              <Typography variant="body2" color="text.disabled">Choose an endpoint from the left sidebar to view details and code examples.</Typography>
            </Paper>
          ) : (
            <>
              <Paper sx={{ p: 3, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                  <Chip label={selectDoc.method} size="medium" sx={{ color: '#fff', fontWeight: 700, bgcolor: methodColor[selectDoc.method] || '#666', minWidth: 64, fontSize: '0.85rem' }} />
                  <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95rem' }}>{selectDoc.path}</Typography>
                  <Chip icon={selectDoc.auth === 'None' ? <PublicIcon /> : selectDoc.auth === 'JWT Bearer or API Key' ? <VpnKeyIcon /> : <LockIcon />} label={selectDoc.auth} size="small" variant="outlined" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectDoc.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectDoc.description}</Typography>
              </Paper>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {Object.entries(codeExamples).map(([key, ex]) => (
                  <Chip key={key} label={ex.label} size="small" color={lang === key ? 'primary' : 'default'} variant={lang === key ? 'filled' : 'outlined'} onClick={() => setLang(key)} sx={{ cursor: 'pointer' }} />
                ))}
                <Box sx={{ flexGrow: 1 }} />
                {selectDoc.relatedEndpoint === 'playground' && <Button size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => navigate('/playground')}>Try in Playground</Button>}
              </Box>
              {selectDoc.requestBody && (
                <Paper sx={{ p: 2.5, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}><CodeIcon fontSize="small" color="primary" /> Request</Typography>
                  <CodeBlock code={codeExamples[lang].code(selectDoc)} />
                </Paper>
              )}
              {selectDoc.queryParams && selectDoc.queryParams.length > 0 && (
                <Paper sx={{ p: 2.5, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Query Parameters</Typography>
                  <TableContainer><Table size="small">
                    <TableHead><TableRow><TableCell sx={{ fontWeight: 600 }}>Name</TableCell><TableCell sx={{ fontWeight: 600 }}>Type</TableCell><TableCell sx={{ fontWeight: 600 }}>Required</TableCell><TableCell sx={{ fontWeight: 600 }}>Description</TableCell></TableRow></TableHead>
                    <TableBody>{selectDoc.queryParams.map(p => (
                      <TableRow key={p.name}><TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.name}</TableCell><TableCell><Typography variant="caption">{p.type}</Typography></TableCell><TableCell><Chip label={p.required ? 'Required' : 'Optional'} size="small" color={p.required ? 'error' : 'default'} variant="outlined" /></TableCell><TableCell><Typography variant="caption">{p.description}</Typography></TableCell></TableRow>
                    ))}</TableBody>
                  </Table></TableContainer>
                </Paper>
              )}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {selectDoc.requestBody && <Paper sx={{ p: 2.5, flex: 1, minWidth: 0 }}><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}><CodeIcon fontSize="small" color="primary" /> Request Body</Typography><CodeBlock code={selectDoc.requestBody} /></Paper>}
                <Paper sx={{ p: 2.5, flex: 1, minWidth: 0 }}><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}><CodeIcon fontSize="small" color="success" /> Response</Typography><CodeBlock code={selectDoc.responseBody} /></Paper>
              </Box>
              {selectDoc.exampleResponse && <Paper sx={{ p: 2.5, mt: 2 }}><Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Example Response</Typography><CodeBlock code={selectDoc.exampleResponse} /></Paper>}
            </>
          )}
        </Box>
      </Box>

      <Paper sx={{ mt: 4, p: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.info.dark, 0.06)}, ${alpha(t.palette.primary.dark, 0.04)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>SDK & Provider Configuration</Typography>
            <Typography variant="body2" color="text.secondary">Active providers: {activeProviders.length} &middot; Active models: {activeModels.length}</Typography>
          </Box>
          {loading && <CircularProgress size={20} />}
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" color="primary" /> @ai-sdk/openai-compatible
              </Typography>
              <CodeBlock code={`import { openaiCompatible } from '@ai-sdk/openai-compatible';\n\nconst provider = openaiCompatible({\n  baseURL: 'http://localhost:5005/v1',\n  name: 'mygateway',\n  headers: { 'Authorization': 'Bearer <your-api-key>' }\n});\n\nconst result = await generateText({\n  model: provider('${firstModel?.name ?? 'gpt-4o'}'),\n  prompt: 'Hello!'\n});`} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" color="primary" /> OpenAI SDK (JavaScript)
              </Typography>
              <CodeBlock code={`import OpenAI from 'openai';\nconst client = new OpenAI({\n  baseURL: 'http://localhost:5005/v1',\n  apiKey: '<your-api-key>'\n});\n\nconst chat = await client.chat.completions.create({\n  model: '${firstModel?.name ?? 'gpt-4o'}',\n  messages: [{ role: 'user', content: 'Hello' }]\n});`} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" color="primary" /> Vercel AI SDK Config
              </Typography>
              <CodeBlock code={`{\n  "$schema": "https://opencode.ai/config.json",\n  "provider": {\n    "mygateway": {\n      "npm": "@ai-sdk/openai-compatible",\n      "options": {\n        "baseURL": "http://localhost:5005/v1"\n      },\n      "models": {\n        "${firstModel?.name?.replace(/[.-]/g, '-') ?? 'gpt-4o'}": { "name": "${firstModel?.name ?? 'GPT-4o'}" }${activeModels.slice(0, 3).map(m => `,\n        "${m.name.replace(/[.-]/g, '-')}": { "name": "${m.name}" }`).join('')}\n      }\n    }\n  },\n  "model": "mygateway/${firstModel?.name?.replace(/[.-]/g, '-') ?? 'gpt-4o'}"\n}`} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" color="primary" /> LangChain (Python)
              </Typography>
              <CodeBlock code={`from langchain_openai import ChatOpenAI\n\nllm = ChatOpenAI(\n  base_url="http://localhost:5005/v1",\n  api_key="<your-api-key>",\n  model="${firstModel?.name ?? 'gpt-4o'}"\n)\nresult = llm.invoke("Hello")\nprint(result.content)`} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" color="primary" /> Python OpenAI (Streaming)
              </Typography>
              <CodeBlock code={`from openai import OpenAI\n\nclient = OpenAI(\n  base_url="http://localhost:5005/v1",\n  api_key="<your-api-key>"\n)\n\nstream = client.chat.completions.create(\n  model="${firstModel?.name ?? 'gpt-4o'}",\n  messages=[{"role": "user", "content": "Hello"}],\n  stream=True\n)\nfor chunk in stream:\n    print(chunk.choices[0].delta.content or "", end="")`} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" color="primary" /> HTTPie / Postman
              </Typography>
              <CodeBlock code={`http POST http://localhost:5005/v1/chat/completions \\\n  Authorization:"Bearer <your-api-key>" \\\n  model="${firstModel?.name ?? 'gpt-4o'}" \\\n  messages:='[{"role":"user","content":"Hello"}]'`} />
            </Paper>
          </Grid>
        </Grid>

        {providerModelMap.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon fontSize="small" /> Providers & Available Models
            </Typography>
            <Grid container spacing={2}>
              {providerModelMap.map(p => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderLeft: 3, borderColor: 'success.main', height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StorageIcon sx={{ fontSize: 16, color: 'success.main' }} /> {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{p.type} &middot; {p.models.length} models</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {p.models.slice(0, 6).map(m => (
                        <Chip key={m.id} label={m.name} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
                      ))}
                      {p.models.length > 6 && <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center' }}>+{p.models.length - 6} more</Typography>}
                    </Box>
                    {p.models.length > 0 && <Box sx={{ mt: 1 }}><CodeBlock code={`model="${p.models[0].name}"`} label="Example:" /></Box>}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: (t) => alpha(t.palette.info.main, 0.04), borderColor: 'info.main' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyIcon fontSize="small" color="info" /> Authentication
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate an API key from the <Chip label="API Keys" size="small" component="a" href="/api-keys" clickable sx={{ cursor: 'pointer' }} /> page. Use as <code>apiKey</code> in SDKs or <code>Authorization: Bearer</code> header. The gateway exposes an OpenAI-compatible <code>/v1</code> endpoint at <code>http://localhost:5005</code>.
          </Typography>
        </Paper>
      </Paper>
    </Box>
  );
};