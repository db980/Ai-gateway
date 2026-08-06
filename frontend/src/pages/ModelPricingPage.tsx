import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel,
  CircularProgress, Alert, IconButton, Tooltip, Avatar, Grid, Chip, alpha, InputAdornment, Select, MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TokenIcon from '@mui/icons-material/Token';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SavingsIcon from '@mui/icons-material/Savings';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import { models, usage, providers } from '../api/endpoints';
import { AIModel, UpdateModelRequest, UsageRecord, Provider } from '../types';

const fmt = (v: number | undefined, digits = 4) => (v != null && !isNaN(v) ? `$${Number(v).toFixed(digits)}` : '—');
const money = (v: number) => (isNaN(v) ? '—' : `$${v.toFixed(4)}`);

export const ModelPricingPage = () => {
  const [data, setData] = useState<AIModel[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkOutput, setBulkOutput] = useState('');
  const [bulkIncludeFree, setBulkIncludeFree] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editModel, setEditModel] = useState<AIModel | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editOutput, setEditOutput] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterProvider, setFilterProvider] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterProviderStatus, setFilterProviderStatus] = useState('active');
  const [filterPricing, setFilterPricing] = useState('');
  const [filterUsage, setFilterUsage] = useState('');
  const [providersList, setProvidersList] = useState<Provider[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [m, u, p] = await Promise.all([
        models.getAll(),
        usage.records(1, 500).catch(() => ({ data: [] as UsageRecord[] })),
        providers.getAll().catch(() => ({ data: [] as Provider[] })),
      ]);
      setData(m.data); setUsageRecords(u.data); setProvidersList(p.data);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  const consumed = useMemo(() => {
    const map: Record<string, { promptTokens: number; completionTokens: number; requests: number }> = {};
    usageRecords.forEach(r => {
      if (!r.isSuccess || !r.modelName) return;
      const entry = map[r.modelName] ?? (map[r.modelName] = { promptTokens: 0, completionTokens: 0, requests: 0 });
      entry.promptTokens += r.promptTokens ?? 0;
      entry.completionTokens += r.completionTokens ?? 0;
      entry.requests += 1;
    });
    return map;
  }, [usageRecords]);

  const providerActiveMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    providersList.forEach(p => { map[p.id] = p.isActive; });
    return map;
  }, [providersList]);

  const activeProviderModels = useMemo(() => data.filter(m => providerActiveMap[m.providerId] === true), [data, providerActiveMap]);
  const baseModels = filterProviderStatus === 'inactive'
    ? data.filter(m => providerActiveMap[m.providerId] !== true)
    : filterProviderStatus === 'active'
      ? activeProviderModels
      : data;

  const pricedCount = baseModels.filter(m => (m.pricePer1kInput != null || m.pricePer1kOutput != null) && !m.isFree).length;
  const unpricedCount = baseModels.filter(m => (m.pricePer1kInput == null && m.pricePer1kOutput == null) && !m.isFree).length;
  const freeCount = baseModels.filter(m => m.isFree).length;
  const pricedModels = baseModels.filter(m => m.pricePer1kInput != null || m.pricePer1kOutput != null);
  const avgInput = pricedModels.length > 0 ? pricedModels.reduce((s, m) => s + (m.pricePer1kInput ?? 0), 0) / pricedModels.length : 0;
  const avgOutput = pricedModels.length > 0 ? pricedModels.reduce((s, m) => s + (m.pricePer1kOutput ?? 0), 0) / pricedModels.length : 0;
  const totalConsumedTokens = usageRecords.filter(r => r.isSuccess).reduce((s, r) => s + (r.totalTokens ?? 0), 0);
  const totalEstimatedCost = baseModels.reduce((sum, m) => {
    const c = consumed[m.name];
    if (!c) return sum;
    const cost = (c.promptTokens * (m.pricePer1kInput ?? 0)) / 1000 + (c.completionTokens * (m.pricePer1kOutput ?? 0)) / 1000;
    return sum + cost;
  }, 0);

  const providerNames = useMemo(() => [...new Set(baseModels.map(m => m.providerName))].sort((a, b) => a.localeCompare(b)), [baseModels]);

  const filteredData = useMemo(() => data.filter(m => {
    if (filterProvider && m.providerName !== filterProvider) return false;
    if (filterModel) {
      const q = filterModel.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !(m.displayName ?? '').toLowerCase().includes(q) && !(m.actualModelName ?? '').toLowerCase().includes(q)) return false;
    }
    if (filterProviderStatus === 'active' && providerActiveMap[m.providerId] !== true) return false;
    if (filterProviderStatus === 'inactive' && providerActiveMap[m.providerId] === true) return false;
    const hasPrice = m.pricePer1kInput != null || m.pricePer1kOutput != null;
    if (filterPricing === 'priced' && !hasPrice) return false;
    if (filterPricing === 'unpriced' && hasPrice) return false;
    if (filterPricing === 'free' && !m.isFree) return false;
    if (filterPricing === 'paid' && m.isFree) return false;
    const hasUsage = !!consumed[m.name];
    if (filterUsage === 'with' && !hasUsage) return false;
    if (filterUsage === 'none' && hasUsage) return false;
    return true;
  }), [data, filterProvider, filterModel, filterProviderStatus, filterPricing, filterUsage, providerActiveMap, consumed]);

  const byProvider = useMemo(() => {
    const groups: Record<string, AIModel[]> = {};
    [...filteredData].sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
      (groups[m.providerName] ??= []).push(m);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredData]);

  const handleBulkApply = async () => {
    if (!bulkInput.trim() && !bulkOutput.trim()) return;
    setBulkLoading(true); setError(''); setBulkResult('');
    try {
      const res = await models.bulkPricing({
        ...(bulkInput.trim() ? { pricePer1kInput: parseFloat(bulkInput) } : {}),
        ...(bulkOutput.trim() ? { pricePer1kOutput: parseFloat(bulkOutput) } : {}),
        includeFree: bulkIncludeFree,
      });
      setBulkResult(`Pricing updated on ${res.data} models`);
      setBulkInput(''); setBulkOutput('');
      await load();
    } catch { setError('Failed to apply pricing'); }
    finally { setBulkLoading(false); }
  };

  const openEdit = (m: AIModel) => {
    setEditModel(m);
    setEditInput(m.pricePer1kInput != null ? String(m.pricePer1kInput) : '');
    setEditOutput(m.pricePer1kOutput != null ? String(m.pricePer1kOutput) : '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editModel) return;
    setSaving(true); setError('');
    const payload: UpdateModelRequest = {};
    if (editInput.trim() !== '') payload.pricePer1kInput = parseFloat(editInput);
    if (editOutput.trim() !== '') payload.pricePer1kOutput = parseFloat(editOutput);
    try { await models.update(editModel.id, payload); setEditOpen(false); await load(); }
    catch { setError('Failed to update model pricing'); }
    finally { setSaving(false); }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {bulkResult && <Alert severity="success" sx={{ mb: 2 }}>{bulkResult}</Alert>}

      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PriceChangeIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Model Pricing</Typography>
              <Typography variant="caption" color="text.secondary">{baseModels.length} models &middot; {pricedCount} priced &middot; {unpricedCount} unpriced &middot; consumed tokens compared against configured rates</Typography>
            </Box>
          </Box>
          <Chip icon={<SavingsIcon />} label={`Est. spend at current prices: ${money(totalEstimatedCost)}`} color="primary" variant="outlined" />
        </Box>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { label: 'Models Priced', value: pricedCount, icon: <AttachMoneyIcon />, color: '#388e3c' },
          { label: 'Without Pricing', value: unpricedCount, icon: <WarningAmberIcon />, color: '#f57c00' },
          { label: 'Free Models', value: freeCount, icon: <CheckCircleIcon />, color: '#1976d2' },
          { label: 'Avg Input $/1K', value: fmt(avgInput, 4), icon: <TokenIcon />, color: '#00796b' },
          { label: 'Avg Output $/1K', value: fmt(avgOutput, 4), icon: <TokenIcon />, color: '#7b1fa2' },
          { label: 'Consumed Tokens', value: totalConsumedTokens.toLocaleString(), icon: <AutoAwesomeIcon />, color: '#e65100' },
        ].map((s, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
            <Paper elevation={0} sx={{
              p: 1.5, textAlign: 'center', height: '100%', borderRadius: 2.5,
              border: '1px solid', borderColor: 'divider',
              background: (t) => `linear-gradient(145deg, ${alpha(s.color, 0.08)}, ${alpha(t.palette.background.paper, 0.95)})`,
            }}>
              <Avatar sx={{ bgcolor: alpha(s.color, 0.15), color: s.color, width: 36, height: 36, mx: 'auto', mb: 0.75 }}>{s.icon}</Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: '0.95rem' }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon fontSize="small" color="primary" /> Set Amount for All Models
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Prices are stored as $ per 1,000 tokens. Applies the same rate to every model at once; leave a field empty to keep it unchanged.
        </Typography>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Input $ / 1K tokens" type="number"
              value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder="e.g. 0.50"
              slotProps={{ htmlInput: { step: '0.01', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Output $ / 1K tokens" type="number"
              value={bulkOutput} onChange={e => setBulkOutput(e.target.value)} placeholder="e.g. 1.50"
              slotProps={{ htmlInput: { step: '0.01', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel control={<Switch checked={bulkIncludeFree} onChange={e => setBulkIncludeFree(e.target.checked)} />} label="Include free models" />
              <Button variant="contained" onClick={handleBulkApply} disabled={bulkLoading || (!bulkInput.trim() && !bulkOutput.trim())} startIcon={bulkLoading ? <CircularProgress size={16} color="inherit" /> : <AttachMoneyIcon />}>
                Apply to All
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.paper' }}>
        <TextField size="small" placeholder="Search model name..." value={filterModel} onChange={e => setFilterModel(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, endAdornment: filterModel ? <IconButton size="small" onClick={() => setFilterModel('')}><ClearIcon fontSize="small" /></IconButton> : undefined } }}
          sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <Select size="small" value={filterProvider} onChange={e => setFilterProvider(e.target.value)} displayEmpty sx={{ minWidth: 180 }}>
          <MenuItem value="">All Providers</MenuItem>
          {providerNames.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </Select>
        <Select size="small" value={filterProviderStatus} onChange={e => setFilterProviderStatus(e.target.value)} displayEmpty sx={{ minWidth: 150 }}>
          <MenuItem value="">All Provider Status</MenuItem>
          <MenuItem value="active">Active Providers</MenuItem>
          <MenuItem value="inactive">Inactive Providers</MenuItem>
        </Select>
        <Select size="small" value={filterPricing} onChange={e => setFilterPricing(e.target.value)} displayEmpty sx={{ minWidth: 140 }}>
          <MenuItem value="">All Pricing</MenuItem>
          <MenuItem value="priced">Priced</MenuItem>
          <MenuItem value="unpriced">Unpriced</MenuItem>
          <MenuItem value="paid">Paid Models</MenuItem>
          <MenuItem value="free">Free Models</MenuItem>
        </Select>
        <Select size="small" value={filterUsage} onChange={e => setFilterUsage(e.target.value)} displayEmpty sx={{ minWidth: 140 }}>
          <MenuItem value="">All Usage</MenuItem>
          <MenuItem value="with">With Usage</MenuItem>
          <MenuItem value="none">No Usage</MenuItem>
        </Select>
        <Box sx={{ ml: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Showing <Box component="span" sx={{ fontWeight: 700 }}>{filteredData.length}</Box> of {baseModels.length} models
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', maxWidth: '100%', overflowX: 'auto', '& .MuiTable-root': { minWidth: 1000 } }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: (t) => alpha(t.palette.background.default, 0.6), fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' } }}>
              <TableCell>Model</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Input $ / 1K</TableCell>
              <TableCell align="right">Output $ / 1K</TableCell>
              <TableCell align="right">Prompt Tokens</TableCell>
              <TableCell align="right">Completion Tokens</TableCell>
              <TableCell align="right">Est. Cost (consumed &times; price)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byProvider.flatMap(([provider, modelsList]) => [
              <TableRow key={provider}>
                <TableCell colSpan={8} sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.06), py: 0.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>{provider}</Typography>
                </TableCell>
              </TableRow>,
              ...modelsList.map(m => {
                const c = consumed[m.name];
                const promptTokens = c?.promptTokens ?? 0;
                const completionTokens = c?.completionTokens ?? 0;
                const cost = (promptTokens * (m.pricePer1kInput ?? 0)) / 1000 + (completionTokens * (m.pricePer1kOutput ?? 0)) / 1000;
                const priced = m.pricePer1kInput != null || m.pricePer1kOutput != null;
                return (
                  <TableRow key={m.id} hover sx={{ '& td': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 32, height: 32, borderRadius: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.15)}, ${alpha(t.palette.secondary.main, 0.1)})`,
                        }}>
                          <TokenIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.displayName || m.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{m.name}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={m.isFree ? 'Free' : 'Paid'} size="small" color={m.isFree ? 'success' : 'warning'} sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', color: priced ? 'text.primary' : 'text.disabled' }}>{fmt(m.pricePer1kInput)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', color: priced ? 'text.primary' : 'text.disabled' }}>{fmt(m.pricePer1kOutput)}</Typography>
                    </TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{promptTokens ? promptTokens.toLocaleString() : '—'}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{completionTokens ? completionTokens.toLocaleString() : '—'}</Typography></TableCell>
                    <TableCell align="right">
                      {c ? (
                        <Chip label={money(cost)} size="small" color={priced ? 'primary' : 'default'} variant={priced ? 'filled' : 'outlined'} sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem', fontWeight: 600 } }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">No usage</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit pricing"><IconButton onClick={() => openEdit(m)} size="small" sx={{ bgcolor: alpha('#388e3c', 0.08), '&:hover': { bgcolor: alpha('#388e3c', 0.15) } }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              }),
            ])}
            {byProvider.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <PriceChangeIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.4 }} />
                    <Typography color="text.secondary">
                      {data.length === 0 ? 'No models yet. Add your first model to get started.' : 'No models match your filters.'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Pricing — {editModel?.displayName || editModel?.name}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Input $ / 1K tokens" type="number" value={editInput}
            onChange={e => setEditInput(e.target.value)} sx={{ mt: 2 }} placeholder="Leave empty to keep current"
            slotProps={{ htmlInput: { step: '0.0001', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
          <TextField fullWidth label="Output $ / 1K tokens" type="number" value={editOutput}
            onChange={e => setEditOutput(e.target.value)} sx={{ mt: 2 }} placeholder="Leave empty to keep current"
            slotProps={{ htmlInput: { step: '0.0001', min: 0 }, input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Stored per token in the database; the gateway uses this to compute request cost from consumed tokens.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
