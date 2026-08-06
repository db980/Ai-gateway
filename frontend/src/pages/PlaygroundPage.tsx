import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Select, MenuItem, FormControlLabel, Switch,
  Button, CircularProgress, IconButton, Chip, Divider, Slider, Tooltip, Collapse, InputAdornment, alpha,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ApiIcon from '@mui/icons-material/Api';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StopIcon from '@mui/icons-material/Stop';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import { models, chat, type CustomChatConfig } from '../api/endpoints';
import type { AIModel, ChatMessage, ChatSettings, StreamEvent, ChatToolCall } from '../types';

const CUSTOM_API_KEY = '__custom__';
const STORAGE_KEY = 'playground_custom_config';

const defaultSettings: ChatSettings = {
  temperature: 0.7, topP: 1, frequencyPenalty: 0, presencePenalty: 0,
  maxTokens: 4096, stopSequence: '', jsonMode: false, enableThinking: false,
};

const savedConfig = (): CustomChatConfig => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return { baseUrl: '', apiKey: '', modelName: '' }; }
};

const TypingDots = () => (
  <Box sx={{ display: 'flex', gap: 0.5, px: 1 }}>
    {[0, 1, 2].map(i => (
      <Box key={i} sx={{
        width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main',
        animation: 'pulse 1.4s ease-in-out infinite',
        animationDelay: `${i * 0.2}s`,
        '@keyframes pulse': { '0%, 80%, 100%': { opacity: 0.3 }, '40%': { opacity: 1 } },
      }} />
    ))}
  </Box>
);

const MsgTime = () => (
  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', userSelect: 'none' }}>
    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </Typography>
);

const ThinkingPanel = ({ reasoning, toolCalls }: { reasoning: string; toolCalls?: ChatToolCall[] }) => {
  const [open, setOpen] = useState(true);
  const hasThinking = !!reasoning.trim();
  const hasTools = !!toolCalls && toolCalls.length > 0;
  if (!hasThinking && !hasTools) return null;
  return (
    <Box sx={{ mb: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: (t) => alpha(t.palette.grey[100], 0.6), overflow: 'hidden' }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      >
        {hasThinking
          ? <PsychologyIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          : <TerminalIcon sx={{ fontSize: 16, color: 'info.main' }} />}
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {hasThinking ? 'Thinking' : 'Tool calls'}
        </Typography>
        {hasTools && (
          <Box component="span" sx={{ display: 'flex', gap: 0.5, ml: 0.5 }}>
            {toolCalls!.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i).map(t => (
              <Chip key={t.name} label={t.name} size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem', px: 0.75 } }} />
            ))}
          </Box>
        )}
        <ExpandMoreIcon sx={{ fontSize: 16, ml: 'auto', color: 'text.disabled', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 1.5, pb: 1 }}>
          {hasThinking && (
            <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem', lineHeight: 1.7, borderLeft: '2px solid', borderColor: 'warning.main', pl: 1, mb: hasTools ? 1 : 0 }}>
              {reasoning}
            </Typography>
          )}
          {hasTools && toolCalls!.map((t, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
              <TerminalIcon sx={{ fontSize: 14, color: 'info.main', mt: 0.25 }} />
              <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.7rem', lineHeight: 1.6 }}>
                {t.name}
                {t.arguments ? `(${t.arguments})` : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export const PlaygroundPage = () => {
  const [modelList, setModelList] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelObj, setSelectedModelObj] = useState<AIModel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'system', content: 'You are a helpful assistant.' }]);
  const [input, setInput] = useState('');
  const [streamContent, setStreamContent] = useState('');
  const [streamReasoning, setStreamReasoning] = useState('');
  const [streamToolCalls, setStreamToolCalls] = useState<ChatToolCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [streaming, setStreaming] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [customConfig, setCustomConfig] = useState<CustomChatConfig>(savedConfig);
  const [modelSearch, setModelSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef(messages);
  msgRef.current = messages;
  const abortRef = useRef<AbortController | null>(null);

  const providerNames = [...new Set(modelList.map(m => m.providerName))].sort();
  const filteredModels = modelList.filter(m => {
    if (modelSearch && !m.name.toLowerCase().includes(modelSearch.toLowerCase()) && !m.providerName.toLowerCase().includes(modelSearch.toLowerCase())) return false;
    if (providerFilter && m.providerName !== providerFilter) return false;
    return true;
  });

  const isCustom = selectedModel === CUSTOM_API_KEY;

  useEffect(() => { models.getAll().then(r => setModelList(r.data)); }, []);

  useEffect(() => {
    if (selectedModel && selectedModel !== CUSTOM_API_KEY) {
      const found = modelList.find(m => m.name === selectedModel);
      setSelectedModelObj(found ?? null);
    } else {
      setSelectedModelObj(null);
    }
  }, [selectedModel, modelList]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamContent]);

  const handleSend = useCallback(async () => {
    if (!selectedModel || !input.trim()) return;
    const ac = new AbortController();
    abortRef.current = ac;
    const userMsg: ChatMessage = { role: 'user', content: input };
    const newMessages = [...msgRef.current, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setStreamContent('');
    setStreamReasoning('');
    setStreamToolCalls([]);
    let partialContent = '';
    let partialReasoning = '';

    try {
      if (isCustom) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customConfig));
        if (!customConfig.baseUrl || !customConfig.apiKey || !customConfig.modelName) {
          throw new Error('Custom API configuration is incomplete.');
        }
        if (streaming) {
          let fullContent = '';
          let fullReasoning = '';
          const toolCalls: ChatToolCall[] = [];
          await chat.sendCustomStream(
            customConfig, newMessages, (ev: StreamEvent) => {
              if (ev.content) { fullContent += ev.content; partialContent = fullContent; setStreamContent(fullContent); }
              if (ev.reasoning) { fullReasoning += ev.reasoning; partialReasoning = fullReasoning; setStreamReasoning(fullReasoning); }
              if (ev.toolCalls?.length) { toolCalls.push(...ev.toolCalls); setStreamToolCalls([...toolCalls]); }
            }, settings, ac.signal,
          );
          setMessages(prev => [...prev, { role: 'assistant', content: fullContent, reasoning: fullReasoning || undefined, toolCalls: toolCalls.length ? toolCalls : undefined }]);
          setStreamContent('');
          setStreamReasoning('');
          setStreamToolCalls([]);
        } else {
          const content = await chat.sendCustom(customConfig, newMessages, settings);
          setMessages(prev => [...prev, { role: 'assistant', content }]);
        }
      } else {
        if (streaming) {
          let fullContent = '';
          let fullReasoning = '';
          const toolCalls: ChatToolCall[] = [];
          await chat.sendStream(
            { model: selectedModel, messages: newMessages, settings },
            (ev: StreamEvent) => {
              if (ev.content) { fullContent += ev.content; partialContent = fullContent; setStreamContent(fullContent); }
              if (ev.reasoning) { fullReasoning += ev.reasoning; partialReasoning = fullReasoning; setStreamReasoning(fullReasoning); }
              if (ev.toolCalls?.length) { toolCalls.push(...ev.toolCalls); setStreamToolCalls([...toolCalls]); }
            },
            ac.signal,
          );
          setMessages(prev => [...prev, { role: 'assistant', content: fullContent, reasoning: fullReasoning || undefined, toolCalls: toolCalls.length ? toolCalls : undefined }]);
          setStreamContent('');
          setStreamReasoning('');
          setStreamToolCalls([]);
        } else {
          const res = await chat.send({ model: selectedModel, messages: newMessages, settings });
          setMessages(prev => [...prev, { role: 'assistant', content: (res as any).content || '', reasoning: (res as any).reasoning_content || undefined }]);
        }
      }
    } catch (err: any) {
      if (ac.signal.aborted) {
        if (partialContent || partialReasoning) setMessages(prev => [...prev, { role: 'assistant', content: partialContent, reasoning: partialReasoning || undefined }]);
      } else {
        const msg = err?.message || 'Failed to get response. Check your connection and configuration.';
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreamContent('');
      setStreamReasoning('');
      setStreamToolCalls([]);
    }
  }, [selectedModel, input, streaming, settings, isCustom, customConfig]);

  const clearChat = () => {
    setMessages([{ role: 'system', content: 'You are a helpful assistant.' }]);
    setStreamContent('');
    setStreamReasoning('');
    setStreamToolCalls([]);
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const copyRequestCurl = async () => {
    if (!selectedModel) return;
    const systemMsg = messages.find(m => m.role === 'system');
    const userMsgs = messages.filter(m => m.role !== 'system');
    const payload = {
      model: selectedModel,
      messages: [...(systemMsg ? [systemMsg] : []), ...userMsgs],
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.maxTokens,
      stream: streaming,
    };
    const token = localStorage.getItem('token');
    const curl = `curl -X POST http://localhost:5005/gateway/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${token ?? '<YOUR_API_KEY>'}" \\\n  -d '${JSON.stringify(payload)}'`;
    try { await navigator.clipboard.writeText(curl); setCopiedCurl(true); setTimeout(() => setCopiedCurl(false), 1500); } catch { }
  };

  const copyMsg = async (content: string, idx: number) => {
    try { await navigator.clipboard.writeText(content); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); } catch { }
  };

  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ mb: 2, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Playground</Typography>
              <Typography variant="caption" color="text.secondary">Test and experiment with AI models</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField size="small" placeholder="Search models..." value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }} />
              <Select size="small" value={providerFilter} onChange={e => setProviderFilter(e.target.value)} displayEmpty sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}>
                <MenuItem value="">All Providers</MenuItem>
                {providerNames.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
              <Select size="small" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                displayEmpty sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                renderValue={v => {
                  if (!v) return <Typography color="text.secondary">Select model</Typography>;
                  if (v === CUSTOM_API_KEY) return 'Custom API...';
                  const m = modelList.find(x => x.name === v);
                  return m?.name ?? v;
                }}>
                <MenuItem value="" disabled>Select model</MenuItem>
                <Divider />
                <MenuItem value={CUSTOM_API_KEY}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ApiIcon fontSize="small" color="primary" /><Typography sx={{ fontWeight: 600 }}>Custom API...</Typography></Box>
                </MenuItem>
                <Divider />
                {filteredModels.length === 0 && <MenuItem disabled><Typography variant="body2" color="text.secondary">No models match</Typography></MenuItem>}
                {filteredModels.map(m => (
                  <MenuItem key={m.id} value={m.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Typography sx={{ flex: 1, fontSize: '0.9rem' }}>{m.name}</Typography>
                      <Chip label={m.isFree ? 'Free' : 'Paid'} size="small" color={m.isFree ? 'success' : 'warning'} sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                      <Chip label={m.providerName} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Tooltip title={copiedCurl ? 'Copied!' : 'Copy request as curl'}>
              <IconButton onClick={copyRequestCurl} color={copiedCurl ? 'success' : 'default'} size="small" disabled={!selectedModel}>
                {copiedCurl ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <TerminalIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Help & documentation"><IconButton onClick={() => setShowHelp(!showHelp)} color={showHelp ? 'primary' : 'default'} size="small"><HelpOutlineIcon /></IconButton></Tooltip>
            <Tooltip title={showSettings ? 'Hide settings' : 'Show settings'}><IconButton onClick={() => setShowSettings(!showSettings)} color={showSettings ? 'primary' : 'default'} size="small"><SettingsIcon /></IconButton></Tooltip>
            <Tooltip title="Clear chat"><IconButton onClick={clearChat} color="error" size="small"><DeleteIcon /></IconButton></Tooltip>
          </Box>
        </Box>
        {selectedModelObj && (
          <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip icon={<SmartToyIcon />} label={selectedModelObj.name} size="small" color="primary" variant="outlined" />
            <Chip label={selectedModelObj.providerName} size="small" variant="filled" color="default" />
            <Chip label={selectedModelObj.isFree ? 'Free' : 'Paid'} size="small" color={selectedModelObj.isFree ? 'success' : 'warning'} />
            {selectedModelObj.contextWindow && <Chip icon={<MemoryIcon sx={{ fontSize: 13 }} />} label={`${selectedModelObj.contextWindow.toLocaleString()} ctx`} size="small" variant="outlined" />}
            {selectedModelObj.maxTokens && <Chip icon={<MemoryIcon sx={{ fontSize: 13 }} />} label={`${selectedModelObj.maxTokens.toLocaleString()} max`} size="small" variant="outlined" />}
            {selectedModelObj.tpmLimit && <Chip icon={<SpeedIcon sx={{ fontSize: 13 }} />} label={`${(selectedModelObj.tpmLimit / 1000).toFixed(0)}K TPM`} size="small" variant="outlined" />}
            {selectedModelObj.rpmLimit && <Chip icon={<SpeedIcon sx={{ fontSize: 13 }} />} label={`${selectedModelObj.rpmLimit} RPM`} size="small" variant="outlined" />}
            {selectedModelObj.supportsStreaming && <Chip label="Streaming" size="small" variant="outlined" color="secondary" />}
          </Box>
        )}
      </Paper>

      <Collapse in={showHelp}>
        <Paper sx={{ p: 2, mb: 2, bgcolor: (t) => alpha(t.palette.info.main, 0.08), border: '1px solid', borderColor: 'info.main' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutlineIcon fontSize="small" /> How to use the Playground
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>Select a model from the dropdown or use <strong>Custom API</strong> for external services. Configure parameters on the left panel and start chatting.</Typography>
          <Typography variant="body2">Config is saved in your browser. Toggle <strong>Streaming</strong> for real-time responses.</Typography>
        </Paper>
      </Collapse>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 280, flexShrink: 0, overflow: 'auto' }}>
          {showSettings && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                <SettingsIcon fontSize="small" /> Parameters
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>Temperature <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{settings.temperature}</Box></Typography>
              <Slider size="small" value={settings.temperature} step={0.1} min={0} max={2} onChange={(_, v) => setSettings({ ...settings, temperature: v as number })} sx={{ mb: 2, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>Top P <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{settings.topP}</Box></Typography>
              <Slider size="small" value={settings.topP} step={0.1} min={0} max={1} onChange={(_, v) => setSettings({ ...settings, topP: v as number })} sx={{ mb: 2, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Max Tokens</Typography>
                <TextField fullWidth size="small" type="number" value={settings.maxTokens} onChange={e => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 4096 })} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <FormControlLabel control={<Switch size="small" checked={streaming} onChange={e => setStreaming(e.target.checked)} />} label={<Typography variant="body2">Streaming</Typography>} sx={{ mb: 0.5 }} />
              <FormControlLabel control={<Switch size="small" checked={settings.jsonMode ?? false} onChange={e => setSettings({ ...settings, jsonMode: e.target.checked })} />} label={<Typography variant="body2">JSON Mode</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={settings.enableThinking ?? false} onChange={e => setSettings({ ...settings, enableThinking: e.target.checked })} />} label={<Typography variant="body2">Thinking Mode</Typography>} />
            </Paper>
          )}
          {isCustom && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                <ApiIcon fontSize="small" color="primary" /> Custom API
              </Typography>
              <TextField fullWidth size="small" label="Base URL" placeholder="https://api.openai.com/v1" value={customConfig.baseUrl} onChange={e => setCustomConfig({ ...customConfig, baseUrl: e.target.value })} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="API Key" type="password" placeholder="sk-..." value={customConfig.apiKey} onChange={e => setCustomConfig({ ...customConfig, apiKey: e.target.value })} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="Model" placeholder="gpt-4o" value={customConfig.modelName} onChange={e => setCustomConfig({ ...customConfig, modelName: e.target.value })} sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ApiIcon fontSize="inherit" /> Connects directly from browser
              </Typography>
            </Paper>
          )}
        </Box>

        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', bgcolor: (t) => alpha(t.palette.grey[50], 0.5) }}>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 } }}>
            {visibleMessages.length === 0 && !loading && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Box sx={{
                  width: 72, height: 72, borderRadius: 3,
                  background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)}, ${alpha(t.palette.secondary.main, 0.08)})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AutoAwesomeIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.6 }} />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Ready to explore</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isCustom ? 'Configure your custom API on the left, then send a message' : 'Select a model and start chatting'}
                  </Typography>
                </Box>
              </Box>
            )}
            {visibleMessages.map((m, i) => (
              <Box key={i} sx={{
                display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 1, alignItems: 'flex-end',
                animation: 'fadeIn 0.25s ease',
                '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
              }}>
                {m.role !== 'user' && (
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                  }}>
                    <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
                  </Box>
                )}
                <Box sx={{
                  maxWidth: '70%', p: 1.5, borderRadius: 2,
                  position: 'relative', wordBreak: 'break-word',
                  ...(m.role === 'user' ? {
                    background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                    color: '#fff', borderBottomRightRadius: 4,
                  } : {
                    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderBottomLeftRadius: 4,
                  }),
                  boxShadow: (t) => `0 1px 3px ${alpha(t.palette.common.black, 0.06)}`,
                }}>
                  {m.role !== 'user' && <ThinkingPanel reasoning={m.reasoning ?? ''} toolCalls={m.toolCalls} />}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {m.content.startsWith('Error:') ? <Box component="span" sx={{ color: 'error.main' }}>{m.content}</Box> : m.content}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <MsgTime />
                    {m.role !== 'user' && (
                      <IconButton size="small" onClick={() => copyMsg(m.content, i)} sx={{ width: 20, height: 20 }}>
                        {copiedIdx === i ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    )}
                  </Box>
                </Box>
                {m.role === 'user' && (
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: (t) => `linear-gradient(135deg, ${t.palette.secondary.main}, ${t.palette.secondary.dark})`,
                  }}>
                    <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />
                  </Box>
                )}
              </Box>
            ))}
            {(streamContent || streamReasoning || streamToolCalls.length > 0) && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1, alignItems: 'flex-end' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})` }}>
                  <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
                </Box>
                <Box sx={{ maxWidth: '70%', p: 1.5, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderBottomLeftRadius: 4 }}>
                  <ThinkingPanel reasoning={streamReasoning} toolCalls={streamToolCalls} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{streamContent}</Typography>
                </Box>
              </Box>
            )}
            {loading && !streamContent && !streamReasoning && streamToolCalls.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1, alignItems: 'center' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})` }}>
                  <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
                </Box>
                <Box sx={{ p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, borderBottomLeftRadius: 4 }}>
                  <TypingDots />
                </Box>
              </Box>
            )}
            <div ref={chatEndRef} />
          </Box>
          <Divider />
          <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField fullWidth size="small" value={input} onChange={e => setInput(e.target.value)}
                placeholder={selectedModel ? 'Type your message...' : 'Select a model first'}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                multiline maxRows={4} disabled={loading || !selectedModel}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <Button variant="contained" onClick={handleSend} disabled={loading || !selectedModel || !input.trim()}
                sx={{ minWidth: 44, height: 40, borderRadius: 2 }}>
                {loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              </Button>
              {loading && (
                <Tooltip title="Stop generating">
                  <Button variant="outlined" color="error" onClick={stopGenerating}
                    sx={{ minWidth: 40, height: 40, borderRadius: 2, px: 1 }}>
                    <StopIcon />
                  </Button>
                </Tooltip>
              )}
            </Box>
            {selectedModel && <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>Enter to send · Shift+Enter for new line</Typography>}
          </Box>
        </Paper>

        <Paper sx={{ width: 280, p: 2, overflow: 'auto', flexShrink: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>System Prompt</Typography>
          <TextField fullWidth multiline rows={14} size="small" variant="outlined"
            value={messages.find(m => m.role === 'system')?.content || ''}
            onChange={e => setMessages(prev => prev.map((m, i) => i === 0 ? { ...m, content: e.target.value } : m))}
            placeholder="System prompt..."
            sx={{ '& textarea': { fontSize: '0.825rem', fontFamily: 'monospace', lineHeight: 1.6 } }} />
        </Paper>
      </Box>
    </Box>
  );
};