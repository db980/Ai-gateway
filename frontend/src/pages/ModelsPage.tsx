import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControlLabel, Switch, Chip, CircularProgress, Alert, IconButton, Stack, InputAdornment, Tooltip, Avatar, alpha, Grid, Divider, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MemoryIcon from '@mui/icons-material/Memory';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MicIcon from '@mui/icons-material/Mic';
import FunctionsIcon from '@mui/icons-material/Functions';
import StreamIcon from '@mui/icons-material/Stream';
import ClearIcon from '@mui/icons-material/Clear';
import SpeedIcon from '@mui/icons-material/Speed';
import TokenIcon from '@mui/icons-material/Token';
import { models, providers, usage } from '../api/endpoints';
import { AIModel, CreateModelRequest, Provider, UpdateModelRequest, TestResult, BulkModelTestItem, UsageRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, RadialBarChart, RadialBar } from 'recharts';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00796b', '#1565c0', '#6a1b9a', '#2e7d32', '#e65100', '#8e24aa', '#00838f'];

export const ModelsPage = () => {
  const [data, setData] = useState<AIModel[]>([]);
  const [providersList, setProvidersList] = useState<Provider[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editModel, setEditModel] = useState<AIModel | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [filterType, setFilterType] = useState('');
  const [filterCap, setFilterCap] = useState<string>('');
  const [form, setForm] = useState<CreateModelRequest>({ name: '', providerId: '', supportsStreaming: true, isFree: false });
  const [editForm, setEditForm] = useState<UpdateModelRequest>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [bulkTesting, setBulkTesting] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkModelTestItem[] | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dashboardView, setDashboardView] = useState(true);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importProviderId, setImportProviderId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number; failed: string[] } | null>(null);
  const [importError, setImportError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [m, p, u] = await Promise.all([
        models.getAll(), providers.getAll(),
        usage.records(1, 200).catch(() => ({ data: [] })),
      ]);
      setData(m.data); setProvidersList(p.data); setUsageRecords(u.data);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try { await models.create(form); setOpen(false); setForm({ name: '', providerId: '', supportsStreaming: true, isFree: false }); await load(); }
    catch { setError('Failed to create model'); }
  };

  const openEdit = (m: AIModel) => {
    setEditModel(m);
    setEditForm({
      name: m.name, displayName: m.displayName, actualModelName: (m as any).actualModelName,
      contextWindow: m.contextWindow, maxTokens: m.maxTokens, supportsStreaming: m.supportsStreaming,
      supportsImages: (m as any).supportsImages, supportsVision: (m as any).supportsVision,
      isFree: m.isFree, status: m.status,
      tpmLimit: (m as any).tpmLimit, tpdLimit: (m as any).tpdLimit, rpmLimit: (m as any).rpmLimit, maxConcurrency: (m as any).maxConcurrency,
      pricePer1kInput: (m as any).pricePer1kInput, pricePer1kOutput: (m as any).pricePer1kOutput,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editModel) return;
    try { await models.update(editModel.id, editForm); setEditOpen(false); await load(); }
    catch { setError('Failed to update model'); }
  };

  const toggleStatus = async (m: AIModel) => {
    setTogglingId(m.id);
    try { await models.update(m.id, { status: m.status === 'Active' ? 'Inactive' : 'Active' }); await load(); }
    catch { setError('Failed to toggle status'); }
    finally { setTogglingId(null); }
  };

  const testModel = async (id: string) => {
    setTestingId(id);
    try { const res = await models.test(id); setTestResult(res.data); setTestDialogOpen(true); await load(); }
    catch (err: any) { setTestResult({ success: false, message: err?.response?.data?.message ?? err?.message ?? 'Request failed', latencyMs: 0 }); setTestDialogOpen(true); }
    finally { setTestingId(null); }
  };

  const testBulk = async (modelsToTest: AIModel[]) => {
    setBulkTesting(true); setBulkResults([]); setBulkProgress(0); setBulkDialogOpen(true);
    const results: BulkModelTestItem[] = [];
    const total = modelsToTest.length;
    const CONCURRENCY = 10;
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < total) {
        const i = next++;
        const m = modelsToTest[i];
        let success = false;
        let message = 'Request failed';
        let latency = 0;
        let response = '';
        try {
          const res = await models.test(m.id);
          success = res.data.success;
          message = res.data.message;
          latency = res.data.latencyMs;
          response = res.data.response ?? '';
        } catch { /* keep defaults */ }
        const status = success ? 'Active' : 'Inactive';
        if (m.status !== 'Deprecated') {
          try { await models.update(m.id, { status }); } catch { /* ignore */ }
        }
        results.push({ modelId: m.id, modelName: m.name, providerName: m.providerName, success, message, latencyMs: latency, status: m.status === 'Deprecated' ? 'Deprecated' : status, response });
        done++;
        setBulkResults([...results]);
        setBulkProgress(done);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()));
    setBulkTesting(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try { await models.delete(deleteConfirmId); setDeleteConfirmId(null); await load(); }
    catch { setError('Failed to delete model'); }
    finally { setDeleting(false); }
  };

  const modelUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    usageRecords.filter(r => r.isSuccess).forEach(r => { if (r.modelName) counts[r.modelName] = (counts[r.modelName] || 0) + 1; });
    return counts;
  }, [usageRecords]);

  const modelTokenCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    usageRecords.filter(r => r.isSuccess).forEach(r => { if (r.modelName) counts[r.modelName] = (counts[r.modelName] || 0) + (r.totalTokens ?? 0); });
    return counts;
  }, [usageRecords]);

  const runQuery = async () => {
    if (!selectedModelId || !queryInput.trim()) return;
    setQueryLoading(true); setQueryResult('');
    try {
      const sel = data.find(m => m.id === selectedModelId);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: sel?.name ?? '', messages: [{ role: 'user', content: queryInput }], stream: false }),
      });
      const json = await res.json();
      if (!res.ok) setQueryResult((json as any).error?.message ?? (json as any).message ?? `Request failed (${res.status})`);
      else setQueryResult((json as any).content ?? JSON.stringify(json));
    } catch (err: any) { setQueryResult(err?.message ?? 'Request failed'); }
    finally { setQueryLoading(false); }
  };

  const handleExport = () => {
    const rows = filteredData.map(m => ({
      name: m.name,
      displayName: m.displayName ?? null,
      actualModelName: (m as any).actualModelName ?? null,
      providerId: m.providerId,
      providerName: m.providerName,
      contextWindow: m.contextWindow ?? null,
      maxTokens: m.maxTokens ?? null,
      supportsStreaming: m.supportsStreaming,
      supportsImages: (m as any).supportsImages ?? false,
      supportsVision: (m as any).supportsVision ?? false,
      supportsAudio: (m as any).supportsAudio ?? false,
      supportsFunctionCalling: (m as any).supportsFunctionCalling ?? false,
      isFree: m.isFree,
      pricePer1kInput: (m as any).pricePer1kInput ?? null,
      pricePer1kOutput: (m as any).pricePer1kOutput ?? null,
      tpmLimit: (m as any).tpmLimit ?? null,
      tpdLimit: (m as any).tpdLimit ?? null,
      rpmLimit: (m as any).rpmLimit ?? null,
      maxConcurrency: (m as any).maxConcurrency ?? null,
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `models-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportFile(e.target.files?.[0] ?? null);
    setImportResult(null);
    setImportError('');
  };

  const handleImport = async () => {
    if (!importProviderId || !importFile) { setImportError('Select a target provider and a JSON file.'); return; }
    setImporting(true); setImportResult(null); setImportError('');
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : (parsed as any).models;
      if (!Array.isArray(arr)) throw new Error('File must be a JSON array or { "models": [...] }');
      const payload: CreateModelRequest[] = arr.map((r: any) => ({
        name: String(r.name ?? r.modelName ?? '').trim(),
        providerId: importProviderId,
        displayName: r.displayName ?? null,
        actualModelName: r.actualModelName ?? null,
        contextWindow: r.contextWindow ? Number(r.contextWindow) : undefined,
        maxTokens: r.maxTokens ? Number(r.maxTokens) : undefined,
        supportsStreaming: r.supportsStreaming ?? true,
        supportsImages: r.supportsImages ?? false,
        supportsVision: r.supportsVision ?? false,
        supportsAudio: r.supportsAudio ?? false,
        supportsFunctionCalling: r.supportsFunctionCalling ?? false,
        isFree: r.isFree ?? false,
        pricePer1kInput: r.pricePer1kInput != null ? Number(r.pricePer1kInput) : undefined,
        pricePer1kOutput: r.pricePer1kOutput != null ? Number(r.pricePer1kOutput) : undefined,
        tpmLimit: r.tpmLimit != null ? Number(r.tpmLimit) : undefined,
        tpdLimit: r.tpdLimit != null ? Number(r.tpdLimit) : undefined,
        rpmLimit: r.rpmLimit != null ? Number(r.rpmLimit) : undefined,
        maxConcurrency: r.maxConcurrency != null ? Number(r.maxConcurrency) : undefined,
      }));
      const res = await models.import(importProviderId, payload);
      setImportResult(res.data);
      await load();
    } catch (err: any) { setImportError(err?.message ?? 'Import failed'); }
    finally { setImporting(false); }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  const inactiveProviderIds = new Set(providersList.filter(p => !p.isActive).map(p => p.id));
  const providerMap = Object.fromEntries(providersList.map(p => [p.id, p]));

  const modelsWithStatus = data.map(m => {
    const provInactive = inactiveProviderIds.has(m.providerId);
    const provName = providerMap[m.providerId]?.name ?? m.providerName;
    const provActive = providerMap[m.providerId]?.isActive ?? true;
    return { ...m, providerInactive: provInactive, effectiveStatus: provInactive ? 'Inactive' : m.status, providerActive: provActive, providerName: provName };
  });

  const activeModels = modelsWithStatus.filter(m => m.effectiveStatus === 'Active');
  const inactiveByProvider = modelsWithStatus.filter(m => m.providerInactive);
  const freeModels = data.filter(m => m.isFree);
  const streamingModels = data.filter(m => m.supportsStreaming);
  const visionModels = data.filter(m => m.supportsVision);

  const trendingModels = [...modelsWithStatus].sort((a, b) => (modelUsageCounts[b.name] ?? 0) - (modelUsageCounts[a.name] ?? 0)).slice(0, 8);

  const filteredData = modelsWithStatus.filter(m => {
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !(m.displayName ?? '').toLowerCase().includes(q) && !m.providerName.toLowerCase().includes(q) && !(m as any).actualModelName?.toLowerCase().includes(q)) return false;
    }
    if (filterProvider && m.providerId !== filterProvider) return false;
    if (filterStatus && m.effectiveStatus !== filterStatus) return false;
    if (filterType === 'free' && !m.isFree) return false;
    if (filterType === 'paid' && m.isFree) return false;
    if (filterCap === 'streaming' && !m.supportsStreaming) return false;
    if (filterCap === 'vision' && !m.supportsVision) return false;
    if (filterCap === 'audio' && !(m as any).supportsAudio) return false;
    if (filterCap === 'functionCalling' && !(m as any).supportsFunctionCalling) return false;
    return true;
  });

  const bulkTargetModels = filterProvider ? data.filter(m => m.providerId === filterProvider) : data;

  const modelsByProvider = Object.entries(
    data.reduce<Record<string, number>>((acc, m) => { const p = providersList.find(p => p.id === m.providerId); acc[p?.name ?? 'Unknown'] = (acc[p?.name ?? 'Unknown'] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  const contextChart = [
    { range: '0-4K', count: data.filter(m => (m.contextWindow ?? 0) < 4096).length },
    { range: '4K-8K', count: data.filter(m => (m.contextWindow ?? 0) >= 4096 && (m.contextWindow ?? 0) < 8192).length },
    { range: '8K-32K', count: data.filter(m => (m.contextWindow ?? 0) >= 8192 && (m.contextWindow ?? 0) < 32768).length },
    { range: '32K-128K', count: data.filter(m => (m.contextWindow ?? 0) >= 32768 && (m.contextWindow ?? 0) < 131072).length },
    { range: '128K+', count: data.filter(m => (m.contextWindow ?? 0) >= 131072).length },
  ];

  const usageChartData = trendingModels.map(m => ({ name: m.name.length > 18 ? m.name.slice(0, 16) + '..' : m.name, requests: modelUsageCounts[m.name] ?? 0, tokens: modelTokenCounts[m.name] ?? 0 }));

  const avgContext = data.length > 0 ? Math.round(data.reduce((s, m) => s + (m.contextWindow ?? 0), 0) / data.length).toLocaleString() : 'N/A';
  const avgMaxTokens = data.length > 0 ? Math.round(data.reduce((s, m) => s + (m.maxTokens ?? 0), 0) / data.length).toLocaleString() : 'N/A';

  const selModel = selectedModelId ? data.find(m => m.id === selectedModelId) : null;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SmartToyIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>AI Models</Typography>
              <Typography variant="caption" color="text.secondary">{data.length} models &middot; {activeModels.length} active &middot; {providersList.length} providers &middot; {providersList.filter(p => !p.isActive).length} offline &middot; {providersList.filter(p => p.isActive).length} online &middot; {usageRecords.filter(r => r.isSuccess).length} requests tracked</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant={dashboardView ? 'contained' : 'outlined'} size="small" onClick={() => setDashboardView(true)}>Dashboard</Button>
            <Button variant={!dashboardView ? 'contained' : 'outlined'} size="small" onClick={() => setDashboardView(false)}>List</Button>
            {!dashboardView && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add Model</Button>}
          </Box>
        </Box>
      </Paper>

      {dashboardView ? (
        <>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { label: 'Total Models', value: data.length, icon: <SmartToyIcon />, color: '#1976d2' },
              { label: 'Active', value: activeModels.length, icon: <CheckCircleIcon />, color: '#388e3c' },
              { label: 'Inactive', value: data.length - activeModels.length, icon: <CancelIcon />, color: '#c62828' },
              { label: 'by Provider', value: inactiveByProvider.length, icon: <StorageIcon />, color: '#e65100' },
              { label: 'Free Models', value: freeModels.length, icon: <AttachMoneyIcon />, color: '#2e7d32' },
              { label: 'Paid', value: data.length - freeModels.length, icon: <AttachMoneyIcon />, color: '#f57c00' },
              { label: 'Streaming', value: streamingModels.length, icon: <StreamIcon />, color: '#7b1fa2' },
              { label: 'Vision', value: visionModels.length, icon: <VisibilityIcon />, color: '#1565c0' },
              { label: 'Avg Context', value: avgContext, icon: <MemoryIcon />, color: '#00695c' },
              { label: 'Avg Max Tokens', value: avgMaxTokens, icon: <MemoryIcon />, color: '#e65100' },
            ].map((s, i) => (
              <Grid size={{ xs: 6, sm: 4, md: 2.66 }} key={i}>
                <Paper elevation={0} sx={{
                  p: 1.5, textAlign: 'center', height: '100%', borderRadius: 2.5,
                  border: '1px solid', borderColor: 'divider',
                  background: (t) => `linear-gradient(145deg, ${alpha(s.color, 0.08)}, ${alpha(t.palette.background.paper, 0.95)})`,
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 18px ${alpha(s.color, 0.15)}`, transition: 'all 0.2s' },
                }}>
                  <Avatar sx={{ bgcolor: alpha(s.color, 0.15), color: s.color, width: 36, height: 36, mx: 'auto', mb: 0.75 }}>{s.icon}</Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{s.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon fontSize="small" /> Usage Trend &mdash; Requests vs Tokens
                </Typography>
                {usageChartData.every(d => d.requests === 0) ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No usage data yet</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={usageChartData} layout="vertical" margin={{ left: 90 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8.5 }} width={90} />
                      <ReTooltip />
                      <Bar dataKey="requests" fill="#1976d2" radius={[0, 4, 4, 0]} name="Requests" />
                      <Bar dataKey="tokens" fill="#2e7d32" radius={[0, 4, 4, 0]} name="Tokens" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ModelTrainingIcon fontSize="small" /> Test a Model
                </Typography>
                <Select fullWidth size="small" value={selectedModelId ?? ''} onChange={e => setSelectedModelId(e.target.value)} displayEmpty sx={{ mb: 1.5 }}>
                  <MenuItem value="" disabled>Select a model to test</MenuItem>
                  {activeModels.map(m => <MenuItem key={m.id} value={m.id}>{m.name} ({m.providerName})</MenuItem>)}
                </Select>
                <TextField fullWidth size="small" multiline minRows={2} maxRows={4} value={queryInput} onChange={e => setQueryInput(e.target.value)} placeholder="Enter your prompt..." disabled={!selectedModelId || queryLoading} sx={{ mb: 1.5 }} />
                <Button variant="contained" fullWidth onClick={runQuery} disabled={!selectedModelId || !queryInput.trim() || queryLoading} startIcon={queryLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}>
                  {queryLoading ? 'Sending...' : 'Send Request'}
                </Button>
                {queryResult && (
                  <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, maxHeight: 140, overflow: 'auto', bgcolor: 'grey.50' }}>
                    <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem' }}>{queryResult}</Typography>
                  </Paper>
                )}
                {selModel && (
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={selModel.name} size="small" color="primary" variant="outlined" />
                    <Chip label={selModel.providerName} size="small" />
                    {selModel.isFree && <Chip label="Free" size="small" color="success" />}
                    {selModel.contextWindow && <Chip label={`${selModel.contextWindow.toLocaleString()} ctx`} size="small" variant="outlined" />}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Models by Provider</Typography>
                {modelsByProvider.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No models</Typography> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={modelsByProvider} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8.5 }} width={90} />
                      <ReTooltip />
                      <Bar dataKey="count" fill="#1976d2" radius={[0, 4, 4, 0]} name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Context Window Distribution</Typography>
                {contextChart.every(c => c.count === 0) ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No data</Typography> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={contextChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ReTooltip />
                      <Bar dataKey="count" fill="#00796b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Status Overview</Typography>
                <ResponsiveContainer width="100%" height={140}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={60} barSize={12} data={[
                    { name: 'Active', value: activeModels.length, fill: '#388e3c' },
                    { name: 'Provider Offline', value: inactiveByProvider.length, fill: '#e65100' },
                    { name: 'Inactive', value: data.length - activeModels.length - inactiveByProvider.length, fill: '#c62828' },
                  ]}>
                    <RadialBar dataKey="value" cornerRadius={6} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#388e3c' }} /><Typography variant="caption">Active {activeModels.length}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#e65100' }} /><Typography variant="caption">Provider Offline {inactiveByProvider.length}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#c62828' }} /><Typography variant="caption">Inactive {data.length - activeModels.length - inactiveByProvider.length}</Typography></Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Free vs Paid</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{ n: 'Free', v: freeModels.length }, { n: 'Paid', v: data.length - freeModels.length }]} dataKey="v" cx="50%" cy="50%" outerRadius={60} innerRadius={28}>
                      <Cell fill="#2e7d32" /><Cell fill="#f57c00" />
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} /><Typography variant="caption">Free {freeModels.length}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f57c00' }} /><Typography variant="caption">Paid {data.length - freeModels.length}</Typography></Box>
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon fontSize="small" /> Capabilities Breakdown
                </Typography>
                {[
                  { label: 'Streaming', count: streamingModels.length, total: data.length, color: '#7b1fa2' },
                  { label: 'Vision', count: visionModels.length, total: data.length, color: '#1565c0' },
                  { label: 'Images', count: data.filter(m => (m as any).supportsImages).length, total: data.length, color: '#00838f' },
                  { label: 'Function Calling', count: data.filter(m => (m as any).supportsFunctionCalling).length, total: data.length, color: '#e65100' },
                  { label: 'Audio', count: data.filter(m => (m as any).supportsAudio).length, total: data.length, color: '#6a1b9a' },
                ].map((cap, i) => {
                  const pct = cap.total > 0 ? ((cap.count / cap.total) * 100).toFixed(0) : '0';
                  return (
                    <Box key={i} sx={{ mb: 0.75 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.15 }}>
                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>{cap.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{cap.count}/{cap.total} ({pct}%)</Typography>
                      </Box>
                      <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: cap.color, borderRadius: 3, transition: 'width 0.5s' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StorageIcon fontSize="small" /> Provider Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {providersList.slice(0, 8).map(p => {
                    const modelCount = data.filter(m => m.providerId === p.id).length;
                    const activeCount = data.filter(m => m.providerId === p.id && m.status === 'Active').length;
                    const pct = modelCount > 0 ? ((activeCount / modelCount) * 100).toFixed(0) : '0';
                    const isInactive = !p.isActive;
                    return (
                      <Box key={p.id} sx={{ opacity: isInactive ? 0.5 : 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.15 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>{p.name} {isInactive && <Box component="span" sx={{ color: 'error.main', fontSize: '0.6rem' }}>(offline)</Box>}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{isInactive ? '0' : activeCount}/{modelCount}</Typography>
                        </Box>
                        <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: isInactive ? '0%' : `${pct}%`, bgcolor: isInactive ? '#c62828' : '#388e3c', borderRadius: 3 }} />
                        </Box>
                      </Box>
                    );
                  })}
                  {providersList.length === 0 && <Typography variant="body2" color="text.secondary">No providers</Typography>}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon fontSize="small" /> Context Window vs Max Tokens
                </Typography>
                {data.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No data</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="x" name="Context Window" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="y" name="Max Tokens" tick={{ fontSize: 10 }} />
                      <ReTooltip formatter={(v: any) => v.toLocaleString()} />
                      <Scatter data={data.filter(m => m.contextWindow && m.maxTokens).map(m => ({ x: m.contextWindow!, y: m.maxTokens!, name: m.name }))} fill="#1976d2" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SmartToyIcon fontSize="small" /> Model Stats Summary
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                  {[
                    { label: 'Total Models', value: data.length },
                    { label: 'Active Rate', value: data.length > 0 ? `${((activeModels.length / data.length) * 100).toFixed(1)}%` : 'N/A' },
                    { label: 'Free Rate', value: data.length > 0 ? `${((freeModels.length / data.length) * 100).toFixed(1)}%` : 'N/A' },
                    { label: 'Streaming Support', value: data.length > 0 ? `${((streamingModels.length / data.length) * 100).toFixed(1)}%` : 'N/A' },
                    { label: 'Avg Context', value: avgContext },
                    { label: 'Avg Max Tokens', value: avgMaxTokens },
                    { label: 'Providers', value: providersList.length },
                    { label: 'Avg Models/Provider', value: providersList.length > 0 ? (data.length / providersList.length).toFixed(1) : 'N/A' },
                  ].map((s, i) => (
                    <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between', mt: i > 0 ? 0.75 : 0 }}>
                      {s.label} <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{s.value}</Box>
                    </Typography>
                  ))}
                </Paper>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon fontSize="small" /> Top Models by Usage
            </Typography>
            {trendingModels.every(m => !modelUsageCounts[m.name]) ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No usage data yet</Typography>
            ) : (
              <Grid container spacing={1.5}>
                {trendingModels.filter(m => modelUsageCounts[m.name]).map((m, i) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={m.id}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderLeft: 3, borderColor: COLORS[i % COLORS.length], '&:hover': { bgcolor: 'action.hover' } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.name}</Typography>
                        <Chip label={`#${i + 1}`} size="small" sx={{ height: 18, bgcolor: COLORS[i % COLORS.length], color: '#fff', fontSize: '0.6rem' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{m.providerName}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={`${modelUsageCounts[m.name] ?? 0} req`} size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
                        {m.contextWindow && <Chip label={`${(m.contextWindow / 1000).toFixed(0)}K ctx`} size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }} />}
                        {modelTokenCounts[m.name] > 0 && <Chip label={`${(modelTokenCounts[m.name] / 1000).toFixed(1)}K tok`} size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }} />}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.paper' }}>
            <TextField size="small" placeholder="Search name, provider, model ID..." value={search} onChange={e => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, endAdornment: search ? <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton> : undefined } }}
              sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Select size="small" value={filterProvider} onChange={e => setFilterProvider(e.target.value)} displayEmpty sx={{ minWidth: 150 }}>
              <MenuItem value="">All Providers</MenuItem>
              {providersList.filter(p => p.isActive).map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
            <Select size="small" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} displayEmpty sx={{ minWidth: 120 }}>
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
            <Select size="small" value={filterType} onChange={e => setFilterType(e.target.value)} displayEmpty sx={{ minWidth: 110 }}>
              <MenuItem value="">All Pricing</MenuItem>
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
            </Select>
            <Select size="small" value={filterCap} onChange={e => setFilterCap(e.target.value)} displayEmpty sx={{ minWidth: 130 }}>
              <MenuItem value="">All Capabilities</MenuItem>
              <MenuItem value="streaming">Streaming</MenuItem>
              <MenuItem value="vision">Vision</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="functionCalling">Function Calling</MenuItem>
            </Select>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Showing <Box component="span" sx={{ fontWeight: 700 }}>{filteredData.length}</Box> of {data.length}
              </Typography>
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport} disabled={filteredData.length === 0} sx={{ borderRadius: 2, textTransform: 'none' }}>
                Export
              </Button>
              <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={() => { setImportOpen(true); setImportResult(null); setImportError(''); }} sx={{ borderRadius: 2, textTransform: 'none' }}>
                Import
              </Button>
              <Tooltip title={filterProvider ? `Test all ${bulkTargetModels.length} models of the selected provider; pass = Active, fail = Inactive` : 'Test all models; pass = Active, fail = Inactive'}>
                <Button variant="outlined" startIcon={bulkTesting ? <CircularProgress size={16} /> : <PlayArrowIcon />} onClick={() => testBulk(bulkTargetModels)} disabled={bulkTesting || bulkTargetModels.length === 0} sx={{ borderRadius: 2, textTransform: 'none' }}>
                  {bulkTesting ? `Testing ${bulkProgress}/${bulkTargetModels.length}...` : filterProvider ? `Bulk Test ${providerMap[filterProvider]?.name ?? ''} (${bulkTargetModels.length})` : `Bulk Test All (${bulkTargetModels.length})`}
                </Button>
              </Tooltip>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ borderRadius: 2, textTransform: 'none' }}>Add Model</Button>
            </Box>
          </Paper>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', maxWidth: '100%', overflowX: 'auto', '& .MuiTable-root': { minWidth: 1100 } }}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: (t) => alpha(t.palette.background.default, 0.6), fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' } }}>
                  <TableCell>Name</TableCell><TableCell>Provider</TableCell><TableCell>Price</TableCell><TableCell>Context</TableCell><TableCell>Max Tokens</TableCell>
                  <TableCell>Limits</TableCell><TableCell>Capabilities</TableCell><TableCell>Usage</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((m) => (
                  <TableRow key={m.id} hover sx={{ '& td': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 36, height: 36, borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.15)}, ${alpha(t.palette.secondary.main, 0.1)})`,
                          opacity: m.providerInactive ? 0.5 : 1,
                        }}>
                          <SmartToyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, textDecoration: m.providerInactive ? 'line-through' : 'none', opacity: m.providerInactive ? 0.6 : 1 }}>
                            {m.displayName || m.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', opacity: m.providerInactive ? 0.6 : 1 }}>{m.name}</Typography>
                          {m.alternativeModelName && <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'primary.main', opacity: m.providerInactive ? 0.6 : 1 }}>alias: {m.alternativeModelName}</Typography>}
                          {m.location && <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'text.secondary', opacity: m.providerInactive ? 0.6 : 1 }}>location: {m.location}</Typography>}
                        </Box>
                        {m.providerInactive && <Chip label="Provider Offline" size="small" color="error" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.55rem' } }} />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={m.providerName} size="small" variant={m.providerInactive ? 'filled' : 'outlined'} color={m.providerInactive ? 'default' : undefined} sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem' }, opacity: m.providerInactive ? 0.5 : 1 }} />
                    </TableCell>
                    <TableCell>
                      {m.isFree ? (
                        <Chip label="Free" color="success" size="small" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem' }, opacity: m.providerInactive ? 0.5 : 1 }} />
                      ) : ((m as any).pricePer1kInput != null || (m as any).pricePer1kOutput != null) ? (
                        <Box sx={{ opacity: m.providerInactive ? 0.5 : 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            ${((m as any).pricePer1kInput ?? 0) * 1000 >= 0.01 ? (((m as any).pricePer1kInput ?? 0) * 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}> / ${((m as any).pricePer1kOutput ?? 0) * 1000 >= 0.01 ? (((m as any).pricePer1kOutput ?? 0) * 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}</Box>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>per 1M tokens</Typography>
                        </Box>
                      ) : (
                        <Chip label="Paid" color="warning" size="small" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem' }, opacity: m.providerInactive ? 0.5 : 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, opacity: m.providerInactive ? 0.5 : 1, fontSize: '0.78rem' }}>
                        {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}K` : '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{m.contextWindow ? m.contextWindow.toLocaleString() : ''}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ opacity: m.providerInactive ? 0.5 : 1, fontSize: '0.78rem' }}>{m.maxTokens ? m.maxTokens.toLocaleString() : '-'}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, minWidth: 120 }}>
                        {m.tpmLimit ? <Chip icon={<SpeedIcon sx={{ fontSize: 12 }} />} label={`${(m.tpmLimit / 1000).toFixed(0)}K TPM`} size="small" variant="outlined" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} /> : <Chip icon={<SpeedIcon sx={{ fontSize: 12 }} />} label="∞ TPM" size="small" variant="outlined" color="success" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} />}
                        {m.tpdLimit ? <Chip icon={<TokenIcon sx={{ fontSize: 12 }} />} label={`${(m.tpdLimit / 1000).toFixed(0)}K TPD`} size="small" variant="outlined" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} /> : <Chip icon={<TokenIcon sx={{ fontSize: 12 }} />} label="∞ TPD" size="small" variant="outlined" color="success" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} />}
                        {m.rpmLimit ? <Chip icon={<SpeedIcon sx={{ fontSize: 12 }} />} label={`${m.rpmLimit} RPM`} size="small" variant="outlined" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} /> : <Chip icon={<SpeedIcon sx={{ fontSize: 12 }} />} label="∞ RPM" size="small" variant="outlined" color="success" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} />}
                        {m.maxConcurrency ? <Chip label={`${m.maxConcurrency} conc`} size="small" variant="outlined" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} /> : <Chip label="∞ conc" size="small" variant="outlined" color="success" sx={{ height: 19, '& .MuiChip-label': { fontSize: '0.6rem' } }} />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.4 }}>
                        {m.supportsStreaming && <Tooltip title="Streaming"><Box sx={{ color: '#7b1fa2', display: 'flex', bgcolor: alpha('#7b1fa2', 0.08), borderRadius: 1, p: 0.25 }}><StreamIcon sx={{ fontSize: 14 }} /></Box></Tooltip>}
                        {m.supportsVision && <Tooltip title="Vision"><Box sx={{ color: '#1565c0', display: 'flex', bgcolor: alpha('#1565c0', 0.08), borderRadius: 1, p: 0.25 }}><VisibilityIcon sx={{ fontSize: 14 }} /></Box></Tooltip>}
                        {(m as any).supportsAudio && <Tooltip title="Audio"><Box sx={{ color: '#6a1b9a', display: 'flex', bgcolor: alpha('#6a1b9a', 0.08), borderRadius: 1, p: 0.25 }}><MicIcon sx={{ fontSize: 14 }} /></Box></Tooltip>}
                        {(m as any).supportsFunctionCalling && <Tooltip title="Function Calling"><Box sx={{ color: '#e65100', display: 'flex', bgcolor: alpha('#e65100', 0.08), borderRadius: 1, p: 0.25 }}><FunctionsIcon sx={{ fontSize: 14 }} /></Box></Tooltip>}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {modelUsageCounts[m.name] ? (
                        <Box sx={{ minWidth: 70 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{modelUsageCounts[m.name]} req</Typography>
                          <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 3, mt: 0.25, overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${Math.min(100, Math.round(((modelUsageCounts[m.name] ?? 0) / Math.max(1, Math.max(...Object.values(modelUsageCounts)))) * 100))}%`, bgcolor: 'primary.main', borderRadius: 3 }} />
                          </Box>
                        </Box>
                      ) : <Typography variant="caption" color="text.disabled">No usage</Typography>}
                    </TableCell>
                    <TableCell>
                      {m.providerInactive ? <Chip label="Provider Offline" size="small" color="error" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
                        : <Chip
                            icon={m.status === 'Active' ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : <CancelIcon sx={{ fontSize: 13 }} />}
                            label={m.status}
                            size="small"
                            color={m.status === 'Active' ? 'success' : 'default'}
                            variant={m.status === 'Active' ? 'filled' : 'outlined'}
                            onClick={() => toggleStatus(m)}
                            disabled={togglingId === m.id}
                            sx={{ height: 22, cursor: 'pointer', '& .MuiChip-label': { fontSize: '0.65rem', fontWeight: 600 } }}
                          />}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="Test"><IconButton onClick={() => testModel(m.id)} disabled={testingId === m.id} size="small" sx={{ bgcolor: alpha('#1976d2', 0.08), '&:hover': { bgcolor: alpha('#1976d2', 0.15) } }}>{testingId === m.id ? <CircularProgress size={14} /> : <PlayArrowIcon fontSize="small" />}</IconButton></Tooltip>
                        <Tooltip title="Edit"><IconButton onClick={() => openEdit(m)} size="small" sx={{ bgcolor: alpha('#388e3c', 0.08), '&:hover': { bgcolor: alpha('#388e3c', 0.15) } }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton onClick={() => setDeleteConfirmId(m.id)} size="small" color="error" sx={{ bgcolor: alpha('#d32f2f', 0.08), '&:hover': { bgcolor: alpha('#d32f2f', 0.15) } }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <SmartToyIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.4 }} />
                        <Typography color="text.secondary">
                          {data.length === 0 ? 'No models yet. Add your first model to get started.' : 'No models match your filters.'}
                        </Typography>
                        {data.length === 0 && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}>Add Model</Button>}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Model</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Model Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Display Name" value={form.displayName ?? ''} onChange={e => setForm({ ...form, displayName: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Actual Model Name" value={form.actualModelName ?? ''} onChange={e => setForm({ ...form, actualModelName: e.target.value })} sx={{ mt: 2 }} />
          <Select fullWidth value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value })} displayEmpty sx={{ mt: 2 }}>
            <MenuItem value="" disabled>Select Provider</MenuItem>
            {providersList.filter(p => p.isActive).map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
          <TextField fullWidth label="Context Window" type="number" value={form.contextWindow ?? ''} onChange={e => setForm({ ...form, contextWindow: e.target.value ? parseInt(e.target.value) : undefined })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Max Tokens" type="number" value={form.maxTokens ?? ''} onChange={e => setForm({ ...form, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })} sx={{ mt: 2 }} />
          <FormControlLabel control={<Switch checked={form.supportsStreaming ?? true} onChange={e => setForm({ ...form, supportsStreaming: e.target.checked })} />} label="Streaming" sx={{ mt: 2, display: 'flex' }} />
          <FormControlLabel control={<Switch checked={form.supportsImages ?? false} onChange={e => setForm({ ...form, supportsImages: e.target.checked })} />} label="Images" sx={{ display: 'flex' }} />
          <FormControlLabel control={<Switch checked={form.supportsVision ?? false} onChange={e => setForm({ ...form, supportsVision: e.target.checked })} />} label="Vision" sx={{ display: 'flex' }} />
          <FormControlLabel control={<Switch checked={form.isFree ?? false} onChange={e => setForm({ ...form, isFree: e.target.checked })} />} label="Free Model" sx={{ display: 'flex' }} />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon fontSize="small" color="primary" /> Pricing
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Input $ / 1K tokens" type="number" value={form.pricePer1kInput ?? ''}
                onChange={e => setForm({ ...form, pricePer1kInput: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 0.50"
                slotProps={{ htmlInput: { step: '0.0001', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Output $ / 1K tokens" type="number" value={form.pricePer1kOutput ?? ''}
                onChange={e => setForm({ ...form, pricePer1kOutput: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 1.50"
                slotProps={{ htmlInput: { step: '0.0001', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon fontSize="small" color="primary" /> Rate Limits & Optimization
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Leave blank or enter <strong>0</strong> for no limit (∞)
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="TPM (tokens/min)" type="number" value={form.tpmLimit ?? ''} placeholder="e.g. 8000"
                onChange={e => setForm({ ...form, tpmLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">tpm</Typography></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="TPD (tokens/day)" type="number" value={form.tpdLimit ?? ''} placeholder="e.g. 200000"
                onChange={e => setForm({ ...form, tpdLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">tpd</Typography></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="RPM (requests/min)" type="number" value={form.rpmLimit ?? ''} placeholder="e.g. 30"
                onChange={e => setForm({ ...form, rpmLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">rpm</Typography></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Max Concurrent" type="number" value={form.maxConcurrency ?? ''} placeholder="e.g. 4"
                onChange={e => setForm({ ...form, maxConcurrency: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">req</Typography></InputAdornment> } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save</Button></DialogActions>
      </Dialog>
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Model</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={editForm.name ?? ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Display Name" value={editForm.displayName ?? ''} onChange={e => setEditForm({ ...editForm, displayName: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Actual Model Name" value={editForm.actualModelName ?? ''} onChange={e => setEditForm({ ...editForm, actualModelName: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Context Window" type="number" value={editForm.contextWindow ?? ''} onChange={e => setEditForm({ ...editForm, contextWindow: e.target.value ? parseInt(e.target.value) : undefined })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Max Tokens" type="number" value={editForm.maxTokens ?? ''} onChange={e => setEditForm({ ...editForm, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })} sx={{ mt: 2 }} />
          <FormControlLabel control={<Switch checked={editForm.status === 'Active'} onChange={e => setEditForm({ ...editForm, status: e.target.checked ? 'Active' : 'Inactive' })} />} label={editForm.status === 'Active' ? 'Active' : 'Inactive'} sx={{ mt: 2, display: 'flex' }} />
          <FormControlLabel control={<Switch checked={editForm.supportsStreaming ?? true} onChange={e => setEditForm({ ...editForm, supportsStreaming: e.target.checked })} />} label="Streaming" sx={{ display: 'flex' }} />
          <FormControlLabel control={<Switch checked={editForm.supportsImages ?? false} onChange={e => setEditForm({ ...editForm, supportsImages: e.target.checked })} />} label="Images" sx={{ display: 'flex' }} />
          <FormControlLabel control={<Switch checked={editForm.supportsVision ?? false} onChange={e => setEditForm({ ...editForm, supportsVision: e.target.checked })} />} label="Vision" sx={{ display: 'flex' }} />
          <FormControlLabel control={<Switch checked={editForm.isFree ?? false} onChange={e => setEditForm({ ...editForm, isFree: e.target.checked })} />} label="Free" sx={{ display: 'flex' }} />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon fontSize="small" color="primary" /> Pricing
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Input $ / 1K tokens" type="number" value={editForm.pricePer1kInput ?? ''}
                onChange={e => setEditForm({ ...editForm, pricePer1kInput: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 0.50"
                slotProps={{ htmlInput: { step: '0.0001', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Output $ / 1K tokens" type="number" value={editForm.pricePer1kOutput ?? ''}
                onChange={e => setEditForm({ ...editForm, pricePer1kOutput: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 1.50"
                slotProps={{ htmlInput: { step: '0.0001', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon fontSize="small" color="primary" /> Rate Limits & Optimization
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Leave blank or enter <strong>0</strong> for no limit (∞)
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="TPM (tokens/min)" type="number" value={editForm.tpmLimit ?? ''} placeholder="e.g. 8000"
                onChange={e => setEditForm({ ...editForm, tpmLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">tpm</Typography></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="TPD (tokens/day)" type="number" value={editForm.tpdLimit ?? ''} placeholder="e.g. 200000"
                onChange={e => setEditForm({ ...editForm, tpdLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">tpd</Typography></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="RPM (requests/min)" type="number" value={editForm.rpmLimit ?? ''} placeholder="e.g. 30"
                onChange={e => setEditForm({ ...editForm, rpmLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">rpm</Typography></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Max Concurrent" type="number" value={editForm.maxConcurrency ?? ''} placeholder="e.g. 4"
                onChange={e => setEditForm({ ...editForm, maxConcurrency: e.target.value ? parseInt(e.target.value) : undefined })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">req</Typography></InputAdornment> } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleEditSave}>Save</Button></DialogActions>
      </Dialog>
      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Model</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete this model? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>{deleting ? <CircularProgress size={16} /> : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Result</DialogTitle>
        <DialogContent>
          {testResult && (
            <Stack spacing={1.5} sx={{ mt: 2, alignItems: 'center' }}>
              <Chip label={testResult.success ? 'Success' : 'Failed'} color={testResult.success ? 'success' : 'error'} size="medium" sx={{ fontWeight: 600, px: 2 }} />
              {testResult.status && <Chip label={testResult.status} size="medium" variant="outlined" color={testResult.status === 'Active' ? 'success' : testResult.status === 'Deprecated' ? 'warning' : 'default'} sx={{ fontWeight: 600 }} />}
              <Typography variant="body2" color={testResult.success ? 'success.main' : 'error.main'}>{testResult.message}</Typography>
              <Typography variant="caption" color="text.secondary">Latency: {testResult.latencyMs}ms</Typography>
              {testResult.success && testResult.response && (
                <Paper variant="outlined" sx={{ width: '100%', p: 1.5, maxHeight: 260, overflow: 'auto', bgcolor: 'grey.50' }}>
                  <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{testResult.response}</Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setTestDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Bulk Test Results
          {bulkResults && bulkResults.length > 0 && (
            <Chip sx={{ ml: 1 }} size="small" label={`${bulkResults.filter(r => r.success).length}/${bulkResults.length} passed`} color={bulkResults.every(r => r.success) ? 'success' : 'warning'} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {bulkTesting && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {bulkResults && bulkResults.length > 0 ? `Testing ${bulkResults[bulkResults.length - 1].modelName}...` : 'Starting bulk test...'}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{bulkProgress} / {bulkTargetModels.length}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={(bulkProgress / Math.max(1, bulkTargetModels.length)) * 100} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          )}
          {bulkResults && bulkResults.length > 0 ? (
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                    <TableCell>Model</TableCell><TableCell>Provider</TableCell><TableCell>Result</TableCell><TableCell>New Status</TableCell><TableCell align="right">Latency</TableCell><TableCell>Response</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bulkResults.map(r => (
                    <TableRow key={r.modelId} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.modelName}</Typography></TableCell>
                      <TableCell><Chip label={r.providerName ?? '-'} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} /></TableCell>
                      <TableCell><Chip label={r.success ? 'Pass' : 'Fail'} size="small" color={r.success ? 'success' : 'error'} sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} /></TableCell>
                      <TableCell><Chip label={r.status} size="small" variant="outlined" color={r.status === 'Active' ? 'success' : 'default'} sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} /></TableCell>
                      <TableCell align="right"><Typography variant="caption">{r.latencyMs}ms</Typography></TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>
                        {r.success && r.response ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxHeight: 60, overflow: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{r.response}</Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{r.message || '-'}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="error">Bulk test failed or no models matched.</Alert>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setBulkDialogOpen(false)} disabled={bulkTesting}>Close</Button></DialogActions>
      </Dialog>
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Models</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a JSON file (array of models, or {"{ \"models\": [...] }"}) to bulk-create models under a provider. Duplicate names within the provider are skipped.
          </Typography>
          <Select fullWidth size="small" value={importProviderId} onChange={e => setImportProviderId(e.target.value)} displayEmpty sx={{ mb: 2 }}>
            <MenuItem value="" disabled>Target Provider</MenuItem>
            {providersList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
          <Box>
            <input id="import-file-input" type="file" accept=".json,application/json" onChange={handleImportFile} hidden />
            <label htmlFor="import-file-input">
              <Button component="span" variant="outlined" startIcon={<FileUploadIcon />} fullWidth sx={{ textTransform: 'none' }}>
                {importFile ? importFile.name : 'Choose JSON file'}
              </Button>
            </label>
          </Box>
          {importError && <Alert severity="error" sx={{ mt: 2 }}>{importError}</Alert>}
          {importResult && (
            <Alert severity={importResult.added > 0 || importResult.failed.length === 0 ? 'success' : 'warning'} sx={{ mt: 2 }}>
              Imported {importResult.added}, skipped {importResult.skipped}, failed {importResult.failed.length}.
              {importResult.failed.length > 0 && (
                <Box sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
                  {importResult.failed.slice(0, 20).map((f, i) => <Typography key={i} variant="caption" sx={{ display: 'block' }}>{f}</Typography>)}
                </Box>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>Close</Button>
          <Button variant="contained" onClick={handleImport} disabled={importing || !importProviderId || !importFile}>
            {importing ? <CircularProgress size={18} /> : 'Import Models'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};