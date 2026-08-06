import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Paper, Typography, Box, Grid, Chip, CircularProgress, Alert, Avatar, alpha, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, InputAdornment, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import TodayIcon from '@mui/icons-material/Today';
import TokenIcon from '@mui/icons-material/Token';
import PaymentsIcon from '@mui/icons-material/Payments';
import ErrorIcon from '@mui/icons-material/Error';
import KeyIcon from '@mui/icons-material/Key';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import SavingsIcon from '@mui/icons-material/Savings';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';
import { usage, analytics, models as modelsApi, providers as providersApi } from '../api/endpoints';
import type { UsageSummary, AnalyticsOverview, AIModel, Provider, UsageRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend } from 'recharts';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import InsightsIcon from '@mui/icons-material/Insights';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00796b', '#1565c0', '#6a1b9a', '#2e7d32', '#e65100'];
const REFRESH_INTERVAL = 15000;

function StatusDot({ active }: { active: boolean }) {
  return <FiberManualRecordIcon sx={{ fontSize: 12, color: active ? '#4caf50' : '#ef5350', animation: active ? 'pulse 2s infinite' : 'none', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.5 }, '100%': { opacity: 1 } } }} />;
}

export const DashboardPage = () => {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [allModels, setAllModels] = useState<AIModel[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentRecords, setRecentRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [budget, setBudget] = useState<number>(() => Number(localStorage.getItem('dashboard_budget') || 0));
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [now, setNow] = useState(Date.now());
  const [compareMetric, setCompareMetric] = useState<'requests' | 'tokens' | 'latency' | 'cost'>('requests');
  const [filterDays, setFilterDays] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [onlyActiveProviders, setOnlyActiveProviders] = useState(true);
  const [onlyActiveModels, setOnlyActiveModels] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipFirstFilter = useRef(true);
  const navigate = useNavigate();

  const filterRef = useRef({ days: 'today', from: '', to: '', provider: '', model: '' });
  useEffect(() => { filterRef.current = { days: filterDays, from: customFrom, to: customTo, provider: filterProvider, model: filterModel }; }, [filterDays, customFrom, customTo, filterProvider, filterModel]);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError('');
    const f = filterRef.current;
    const daysNum = f.days === 'custom' || f.days === 'today' ? undefined : Number(f.days);
    const isToday = f.days === 'today';
    const isCustom = f.days === 'custom' && (f.from || f.to);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const fromD = isToday ? todayStart : (isCustom && f.from ? new Date(`${f.from}T00:00:00`) : undefined);
    const toD = isToday ? new Date() : (isCustom && f.to ? new Date(`${f.to}T23:59:59`) : undefined);
    await Promise.all([
      usage.summary().then(r => setSummary(r.data)).catch(() => {}),
      usage.charts(daysNum ?? 30, f.provider || undefined, f.model || undefined, fromD, toD).then(r => setChartData(r.data.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString() })))).catch(() => {}),
      usage.records(1, 1000, daysNum).then(r => { setRecentRecords(r.data); }).catch(() => {}),
      modelsApi.getAll().then(r => setAllModels(r.data)).catch(() => {}),
      providersApi.getAll().then(r => setProviders(r.data)).catch(() => {}),
      analytics.overview().then(r => setOverview(r.data)).catch(() => setOverview(null)),
    ]);
    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, [load]);

  useEffect(() => {
    if (skipFirstFilter.current) { skipFirstFilter.current = false; return; }
    load(true);
  }, [filterDays, customFrom, customTo, filterProvider, filterModel, load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fRecords = useMemo(() => {
    let s: number | null = null;
    let e: number | null = null;
    if (filterDays === 'today') { const st = new Date(); st.setHours(0, 0, 0, 0); s = st.getTime(); e = Date.now(); }
    else if (filterDays === 'custom') {
      s = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : null;
      e = customTo ? new Date(`${customTo}T23:59:59`).getTime() : null;
    }
    const activeProviderNames = new Set(providers.filter(p => p.isActive).map(p => p.name));
    const activeModelNames = new Set(allModels.filter(m => m.status === 'Active').map(m => m.name));
    return recentRecords.filter(r => {
      if (filterProvider && r.providerName !== filterProvider) return false;
      if (filterModel && r.modelName !== filterModel) return false;
      if (filterStatus === 'success' && !r.isSuccess) return false;
      if (filterStatus === 'error' && r.isSuccess) return false;
      if (onlyActiveProviders && r.providerName && !activeProviderNames.has(r.providerName)) return false;
      if (onlyActiveModels && r.modelName && !activeModelNames.has(r.modelName)) return false;
      const t = new Date(r.createdAt).getTime();
      if (s !== null && t < s) return false;
      if (e !== null && t > e) return false;
      return true;
    });
  }, [recentRecords, filterProvider, filterModel, filterStatus, filterDays, customFrom, customTo, onlyActiveProviders, onlyActiveModels, providers, allModels]);

  const periodStats = useMemo(() => {
    const requests = fRecords.length;
    const tokens = fRecords.reduce((s, r) => s + (r.totalTokens ?? 0), 0);
    const cost = fRecords.reduce((s, r) => s + (r.cost ?? 0), 0);
    const errors = fRecords.filter(r => !r.isSuccess).length;
    return { requests, tokens, cost, errors };
  }, [fRecords]);

  const { trendRows, trendModels } = useMemo<{ trendRows: Record<string, string | number>[]; trendModels: string[] }>(() => {
    const byDay: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    fRecords.forEach(r => {
      if (!r.isSuccess || !r.modelName) return;
      const day = new Date(r.createdAt).toLocaleDateString();
      (byDay[day] ??= {})[r.modelName] = ((byDay[day] ?? {})[r.modelName] ?? 0) + 1;
      totals[r.modelName] = (totals[r.modelName] ?? 0) + 1;
    });
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
    const days = Object.keys(byDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const rows = days.map(day => {
      const row: Record<string, string | number> = { date: day };
      top.forEach(m => { row[m] = byDay[day][m] ?? 0; });
      return row;
    });
    return { trendRows: rows, trendModels: top };
  }, [fRecords]);

  const comparison = useMemo<{ name: string; fullName: string; requests: number; tokens: number; latency: number; cost: number }[]>(() => {
    const map: Record<string, { requests: number; tokens: number; latency: number[]; cost: number }> = {};
    fRecords.forEach(r => {
      if (!r.isSuccess || !r.modelName) return;
      const e = map[r.modelName] ??= { requests: 0, tokens: 0, latency: [], cost: 0 };
      e.requests += 1;
      e.tokens += r.totalTokens ?? 0;
      e.cost += r.cost ?? 0;
      if (r.latencyMs) e.latency.push(r.latencyMs);
    });
    return Object.entries(map).map(([name, e]) => ({
      name: name.length > 14 ? name.slice(0, 12) + '…' : name,
      fullName: name,
      requests: e.requests,
      tokens: e.tokens,
      latency: e.latency.length ? Math.round(e.latency.reduce((a, b) => a + b, 0) / e.latency.length) : 0,
      cost: e.cost,
    })).sort((a, b) => b.requests - a.requests).slice(0, 8);
  }, [fRecords]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const activeModels = allModels.filter(m => m.status === 'Active');
  const activeProviders = providers.filter(p => p.isActive);
  const inactiveProviders = providers.filter(p => !p.isActive);
  const inactiveModels = allModels.filter(m => m.status !== 'Active');
  const freeModels = allModels.filter(m => m.isFree);
  const streamingModels = allModels.filter(m => m.supportsStreaming);
  const successRate = periodStats.requests > 0 ? ((1 - periodStats.errors / periodStats.requests) * 100).toFixed(1) : 'N/A';
  const avgTokensPerRequest = periodStats.requests > 0 ? Math.round(periodStats.tokens / periodStats.requests).toLocaleString() : 'N/A';
  const last30Cost = chartData.reduce((s, d) => s + (d.cost || 0), 0);
  const budgetPct = budget > 0 ? Math.min(100, (last30Cost / budget) * 100) : 0;
  const budgetExceeded = budget > 0 && last30Cost >= budget;
  const budgetNear = budget > 0 && !budgetExceeded && budgetPct >= 80;

  const leaderboard = Object.entries(
    fRecords.filter(r => r.isSuccess).reduce<Record<string, { requests: number; latency: number[]; tokens: number; cost: number }>>((acc, r) => {
      const k = r.modelName ?? 'Unknown';
      const e = acc[k] ?? { requests: 0, latency: [], tokens: 0, cost: 0 };
      e.requests += 1;
      if (r.latencyMs) e.latency.push(r.latencyMs);
      e.tokens += r.totalTokens || 0;
      e.cost += r.cost || 0;
      acc[k] = e;
      return acc;
    }, {}),
  ).map(([model, s]) => ({
    model,
    requests: s.requests,
    avgLatency: s.latency.length ? Math.round(s.latency.reduce((a, b) => a + b, 0) / s.latency.length) : 0,
    tokens: s.tokens,
    cost: s.cost,
    costPer1k: s.tokens > 0 ? (s.cost / s.tokens) * 1000 : 0,
  })).sort((a, b) => b.requests - a.requests || a.avgLatency - b.avgLatency).slice(0, 8);

  const providerLive = providers.map(p => {
    const recs = fRecords.filter(r => r.providerName === p.name);
    const ok = recs.filter(r => r.isSuccess);
    const avgLatency = ok.length ? Math.round(ok.reduce((s, r) => s + (r.latencyMs || 0), 0) / ok.length) : 0;
    const lastSeen = recs.length ? new Date(recs[0].createdAt) : null;
    const hoursAgo = lastSeen ? (Date.now() - lastSeen.getTime()) / 3600000 : null;
    return { ...p, requests: recs.length, errors: recs.length - ok.length, avgLatency, lastSeen, hoursAgo };
  });

  const modelUsage = Object.entries(
    fRecords.reduce<Record<string, number>>((acc, r) => { const k = r.modelName ?? 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count, pct: fRecords.length > 0 ? ((count / fRecords.length) * 100).toFixed(1) : '0' }));

  const last5Activity = fRecords.slice(0, 5);
  const fErrors = fRecords.filter(r => !r.isSuccess);
  const last5Errors = fErrors.slice(0, 5);
  const timeSinceRefresh = Math.floor((now - lastRefresh.getTime()) / 1000);

  const tokenMixData = chartData.map(d => ({ date: d.date, promptTokens: d.promptTokens ?? 0, completionTokens: d.completionTokens ?? 0 }));
  const trafficData = chartData.map(d => ({ date: d.date, success: Math.max(0, d.requestCount - (d.errors ?? 0)), errors: d.errors ?? 0 }));
  const latencyData = chartData.map(d => ({ date: d.date, latency: Math.round(d.avgLatencyMs ?? 0) }));
  const providerPie = Object.entries(
    fRecords.reduce<Record<string, number>>((acc, r) => { const k = r.providerName ?? 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  const providerTotal = providerPie.reduce((s, p) => s + p.value, 0);
  const totalPrompt = chartData.reduce((s, d) => s + (d.promptTokens ?? 0), 0);
  const totalCompletion = chartData.reduce((s, d) => s + (d.completionTokens ?? 0), 0);
  const tokenMixPie = [
    { name: 'Prompt', value: totalPrompt },
    { name: 'Completion', value: totalCompletion },
  ];
  const successPct = periodStats.requests > 0 ? Math.min(100, Math.max(0, (1 - periodStats.errors / periodStats.requests) * 100)) : 0;

  const tiles = [
    { title: 'Total Users', value: overview?.totalUsers ?? 0, icon: <PeopleIcon />, color: '#1976d2', path: '/users' },
    { title: 'Active Providers', value: activeProviders.length, icon: <StorageIcon />, color: '#388e3c', path: '/providers', sub: `${inactiveProviders.length} inactive` },
    { title: 'Active Models', value: activeModels.length, icon: <SmartToyIcon />, color: '#2e7d32', path: '/models', sub: `${inactiveModels.length} inactive` },
    { title: 'Requests', value: periodStats.requests.toLocaleString(), icon: <SendIcon />, color: '#f57c00', path: '/usage', sub: filterDays === 'today' ? 'today' : filterDays === 'custom' ? 'custom range' : `last ${filterDays}d` },
    { title: "Today's Requests", value: (summary?.todayRequests ?? 0).toLocaleString(), icon: <TodayIcon />, color: '#7b1fa2', path: '/usage' },
    { title: 'Total Cost', value: `$${periodStats.cost.toFixed(4)}`, icon: <PaymentsIcon />, color: '#c62828', path: '/billing', sub: filterDays === 'today' ? 'today' : filterDays === 'custom' ? 'custom range' : `last ${filterDays}d` },
    { title: 'Avg Response', value: overview?.avgResponseTime ? `${overview.avgResponseTime.toFixed(0)}ms` : 'N/A', icon: <SpeedIcon />, color: '#6a1b9a', path: '/logs' },
    { title: 'Success Rate', value: successRate, icon: <CheckCircleIcon />, color: '#2e7d32', path: '/logs' },
    { title: 'Errors', value: periodStats.errors, icon: <ErrorIcon />, color: '#d32f2f', path: '/logs', sub: filterDays === 'today' ? 'today' : filterDays === 'custom' ? 'custom range' : `last ${filterDays}d` },
    { title: 'Active API Keys', value: summary?.activeApiKeys ?? 0, icon: <KeyIcon />, color: '#1565c0', path: '/api-keys' },
    { title: 'Total Tokens', value: periodStats.tokens.toLocaleString(), icon: <TokenIcon />, color: '#00796b', path: '/usage', sub: filterDays === 'today' ? 'today' : filterDays === 'custom' ? 'custom range' : `last ${filterDays}d` },
    { title: 'Tokens/Request', value: avgTokensPerRequest, icon: <TrendingUpIcon />, color: '#e65100', path: '/usage' },
  ];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OnlinePredictionIcon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <StatusDot active={activeProviders.length > 0} />
                <Typography variant="caption" color="text.secondary">
                  {activeProviders.length > 0 ? 'System Online' : 'No Active Providers'} &middot; Live {timeSinceRefresh < 60 ? `${timeSinceRefresh}s ago` : `${Math.floor(timeSinceRefresh / 60)}m ago`}
                </Typography>
                <Tooltip title="Refresh now">
                  <IconButton size="small" onClick={() => load(true)} disabled={refreshing} sx={{ ml: 0.5 }}>
                    <RefreshIcon sx={{ fontSize: 16, animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip icon={<CheckCircleIcon />} label={activeProviders.length > 0 ? `${activeProviders.length}/${providers.length} Providers Online` : 'No Providers'} color={activeProviders.length > 0 ? 'success' : 'warning'} size="small" />
            <Chip icon={<SmartToyIcon />} label={`${activeModels.length}/${allModels.length} Models Active`} color={activeModels.length > 0 ? 'primary' : 'default'} size="small" variant="outlined" />
            {(summary?.errors ?? 0) > 0 && <Chip icon={<ErrorIcon />} label={`${summary?.errors} Errors`} color="error" size="small" variant="outlined" />}
            <Tooltip title="Set monthly budget alert">
              <Chip
                icon={<SavingsIcon />}
                label={budget > 0 ? `Budget $${budget.toFixed(0)} (${budgetPct.toFixed(0)}%)` : 'Set Budget'}
                color={budgetExceeded ? 'error' : budgetNear ? 'warning' : 'default'}
                size="small" variant={budget > 0 ? 'filled' : 'outlined'}
                onClick={() => { setBudgetInput(budget ? String(budget) : ''); setBudgetDialogOpen(true); }}
                sx={{ cursor: 'pointer', height: 24, '& .MuiChip-label': { fontSize: '0.68rem', fontWeight: 700 } }}
              />
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, minWidth: 90 }}>Filters</Typography>
          <Select value={filterDays} onChange={(e) => setFilterDays(e.target.value)} size="small" sx={{ minWidth: 120 }} inputProps={{ 'aria-label': 'Time range' }}>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="14">Last 14 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 90 days</MenuItem>
            <MenuItem value="custom">Custom range</MenuItem>
          </Select>
          <Select value={filterProvider} onChange={(e) => { setFilterProvider(e.target.value); setFilterModel(''); }} size="small" displayEmpty sx={{ minWidth: 160 }} inputProps={{ 'aria-label': 'Provider' }}>
            <MenuItem value="">All Providers</MenuItem>
            {providers.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
          </Select>
          <Select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} size="small" displayEmpty sx={{ minWidth: 180 }} inputProps={{ 'aria-label': 'Model' }}>
            <MenuItem value="">All Models</MenuItem>
            {(filterProvider ? allModels.filter(m => m.providerName === filterProvider) : allModels).map(m => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="small" displayEmpty sx={{ minWidth: 130 }} inputProps={{ 'aria-label': 'Status' }}>
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="success">Success only</MenuItem>
            <MenuItem value="error">Errors only</MenuItem>
          </Select>
          {filterDays === 'custom' && (
            <TextField label="From" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} size="small" sx={{ maxWidth: 160 }} slotProps={{ htmlInput: { max: customTo || undefined } }} />
          )}
          {filterDays === 'custom' && (
            <TextField label="To" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} size="small" sx={{ maxWidth: 160 }} slotProps={{ htmlInput: { min: customFrom || undefined } }} />
          )}
          <FormControlLabel control={<Switch checked={onlyActiveProviders} onChange={(e) => setOnlyActiveProviders(e.target.checked)} size="small" />} label="Active providers only" sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }} />
          <FormControlLabel control={<Switch checked={onlyActiveModels} onChange={(e) => setOnlyActiveModels(e.target.checked)} size="small" />} label="Active models only" sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }} />
          {(filterDays !== 'today' || customFrom || customTo || filterProvider || filterModel || filterStatus || !onlyActiveProviders || !onlyActiveModels) && (
            <Tooltip title="Reset filters">
              <IconButton size="small" onClick={() => { setFilterDays('today'); setCustomFrom(''); setCustomTo(''); setFilterProvider(''); setFilterModel(''); setFilterStatus(''); setOnlyActiveProviders(true); setOnlyActiveModels(true); }}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {(budgetExceeded || budgetNear) && (
        <Alert
          severity={budgetExceeded ? 'error' : 'warning'}
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit" onClick={() => setBudgetDialogOpen(true)}>Adjust budget</Button>
          }
        >
          {budgetExceeded
            ? `Monthly budget exceeded — spent $${last30Cost.toFixed(2)} of $${budget.toFixed(2)} in the last 30 days.`
            : `Approaching budget — ${budgetPct.toFixed(0)}% of $${budget.toFixed(2)} used in the last 30 days.`}
        </Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {tiles.map((tile) => (
          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={tile.title}>
            <Paper
              sx={{ p: 1.75, cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: (t) => `0 6px 20px ${alpha(t.palette.common.black, 0.1)}` }, '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: tile.color } }}
              onClick={() => navigate(tile.path)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Avatar sx={{ bgcolor: alpha(tile.color, 0.12), color: tile.color, width: 32, height: 32 }}>{tile.icon}</Avatar>
                {(tile.title === 'Active Providers' || tile.title === 'Active Models') && <StatusDot active={(tile.title === 'Active Providers' ? activeProviders.length : activeModels.length) > 0} />}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>{tile.value}</Typography>
              <Typography variant="caption" color="text.secondary">{tile.title}</Typography>
              {(tile as any).sub && <Typography variant="caption" color="error.main" sx={{ display: 'block', fontSize: '0.6rem' }}>{(tile as any).sub}</Typography>}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Requests & Token Usage ({filterDays === 'today' ? 'today' : filterDays === 'custom' ? 'custom range' : `${filterDays}d`})</Typography>
            {chartData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No data yet &mdash; start using models to see activity</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                  <ReTooltip />
                  <Line yAxisId="l" type="monotone" dataKey="requestCount" stroke="#1976d2" strokeWidth={2} dot={false} name="Requests" />
                  <Line yAxisId="r" type="monotone" dataKey="tokenCount" stroke="#2e7d32" strokeWidth={2} dot={false} name="Tokens" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Daily Cost</Typography>
            {chartData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No cost data yet</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ReTooltip formatter={(v: any) => `$${typeof v === 'number' ? v.toFixed(4) : v}`} />
                  <Bar dataKey="cost" fill="#c62828" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DonutLargeIcon fontSize="small" /> Token Mix Trend (Prompt vs Completion)
            </Typography>
            {tokenMixData.every(d => d.promptTokens === 0 && d.completionTokens === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No token data yet</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={tokenMixData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ReTooltip />
                  <Area type="monotone" dataKey="promptTokens" stackId="1" stroke="#1976d2" fill="#1976d2" fillOpacity={0.6} name="Prompt" />
                  <Area type="monotone" dataKey="completionTokens" stackId="1" stroke="#2e7d32" fill="#2e7d32" fillOpacity={0.5} name="Completion" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsightsIcon fontSize="small" /> Success vs Errors Trend
            </Typography>
            {trafficData.every(d => d.success === 0 && d.errors === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No request data yet</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ReTooltip />
                  <Bar dataKey="success" stackId="a" fill="#388e3c" radius={[0, 0, 0, 0]} name="Success" />
                  <Bar dataKey="errors" stackId="a" fill="#c62828" radius={[4, 4, 0, 0]} name="Errors" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShowChartIcon fontSize="small" /> Avg Latency Trend
            </Typography>
            {latencyData.every(d => d.latency === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No latency data yet</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ReTooltip formatter={(v: any) => `${v}ms`} />
                  <Line type="monotone" dataKey="latency" stroke="#7b1fa2" strokeWidth={2} dot={false} name="Avg Latency" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon fontSize="small" /> Requests by Provider
            </Typography>
            {providerPie.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No requests yet</Typography>
            ) : (
              <>
                <Box sx={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={providerPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={62} innerRadius={32} label={(e: any) => `${e.name && e.value ? Math.round((e.value / providerTotal) * 100) : 0}%`}>
                        {providerPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ReTooltip formatter={(v: any, n: any) => [`${v.toLocaleString()} requests`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{providerTotal.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>requests</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {providerPie.map((p, i) => (
                    <Box key={p.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                      <Typography variant="caption" sx={{ fontSize: '0.62rem' }}>{p.name} ({p.value}, {Math.round((p.value / providerTotal) * 100)}%)</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DonutLargeIcon fontSize="small" /> Token Mix ({filterDays === 'today' ? 'today' : filterDays === 'custom' ? 'custom range' : `${filterDays}d`})
            </Typography>
            {totalPrompt === 0 && totalCompletion === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No token data yet</Typography>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={tokenMixPie} dataKey="value" cx="50%" cy="50%" outerRadius={62} innerRadius={34}>
                      <Cell fill="#1976d2" /><Cell fill="#2e7d32" />
                    </Pie>
                    <ReTooltip formatter={(v: any) => Number(v).toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2' }} /><Typography variant="caption" sx={{ fontSize: '0.62rem' }}>Prompt {totalPrompt.toLocaleString()}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} /><Typography variant="caption" sx={{ fontSize: '0.62rem' }}>Completion {totalCompletion.toLocaleString()}</Typography></Box>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon fontSize="small" /> Success Rate
            </Typography>
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={42} outerRadius={68} barSize={14} data={[{ name: 'Success', value: successPct, fill: '#388e3c' }]}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#eee' }} />
                <ReTooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
              </RadialBarChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: -2 }}>
              {successPct.toFixed(1)}% of {periodStats.requests} requests succeeded
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5, mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{periodStats.requests - periodStats.errors} success &middot; {periodStats.errors} errors</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShowChartIcon fontSize="small" /> Most Used Models — Trend Over Time
            </Typography>
            {trendRows.length === 0 || trendModels.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No model usage data yet</Typography>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <ReTooltip />
                    <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
                    {trendModels.map((m, i) => <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} name={m} />)}
                  </LineChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
                  {trendModels.map((m, i) => (
                    <Box key={m} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                      <Typography variant="caption" sx={{ fontSize: '0.62rem' }}>{m}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LeaderboardIcon fontSize="small" /> Model Comparison
              </Typography>
              <Select size="small" value={compareMetric} onChange={e => setCompareMetric(e.target.value as any)} sx={{ minWidth: 110, '& .MuiSelect-select': { fontSize: '0.72rem', py: 0.75 } }}>
                <MenuItem value="requests">Requests</MenuItem>
                <MenuItem value="tokens">Tokens</MenuItem>
                <MenuItem value="latency">Latency</MenuItem>
                <MenuItem value="cost">Cost</MenuItem>
              </Select>
            </Box>
            {comparison.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No data yet</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparison} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8.5 }} width={78} />
                  <ReTooltip formatter={(v: any) =>
                    compareMetric === 'latency' ? `${v}ms` :
                    compareMetric === 'cost' ? `$${Number(v).toFixed(4)}` :
                    compareMetric === 'tokens' ? Number(v).toLocaleString() : v
                  } labelFormatter={(l: any) => comparison.find(c => c.name === l)?.fullName ?? l} />
                  <Bar dataKey={compareMetric} fill={compareMetric === 'latency' ? '#7b1fa2' : compareMetric === 'cost' ? '#c62828' : compareMetric === 'tokens' ? '#2e7d32' : '#1976d2'} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon fontSize="small" /> Top Models by Usage
            </Typography>
            {modelUsage.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No usage data yet</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {modelUsage.map((m, i) => (
                  <Box key={m.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{m.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.count} ({m.pct}%)</Typography>
                    </Box>
                    <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${m.pct}%`, bgcolor: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width 0.5s' }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SendIcon fontSize="small" /> Recent Activity
            </Typography>
            {last5Activity.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No recent activity</Typography>
            ) : (
              <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                {last5Activity.map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: alpha('#1976d2', 0.1) }}><SendIcon sx={{ fontSize: 12, color: '#1976d2' }} /></Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.modelName ?? 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{r.providerName} &middot; {new Date(r.createdAt).toLocaleTimeString()}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{r.latencyMs ? `${r.latencyMs}ms` : ''}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderColor: last5Errors.length > 0 ? 'error.main' : undefined }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon fontSize="small" color={last5Errors.length > 0 ? 'error' : 'disabled'} /> Recent Errors
              </Typography>
              <Chip label={last5Errors.length > 0 ? `${last5Errors.length} issues` : 'All Clear'} size="small" color={last5Errors.length > 0 ? 'error' : 'success'} />
            </Box>
            {last5Errors.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No errors in recent records</Typography>
            ) : (
              <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                {last5Errors.map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: alpha('#d32f2f', 0.1) }}><ErrorIcon sx={{ fontSize: 12, color: '#d32f2f' }} /></Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.modelName ?? 'Unknown'}</Typography>
                      <Typography variant="caption" color="error.main" sx={{ fontSize: '0.6rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.errorMessage ?? 'Unknown error'}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.6rem' }}>{new Date(r.createdAt).toLocaleTimeString()}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <OnlinePredictionIcon fontSize="small" color="primary" /> Live Gateway Status
              </Typography>
              <Chip label="Auto-refresh 15s" size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
            </Box>
            {providers.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No providers configured</Typography>
            ) : (
              <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                {providerLive.map((p) => {
                  const online = p.isActive;
                  const stale = p.hoursAgo !== null && p.hoursAgo > 24;
                  return (
                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusDot active={online} />
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>{p.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>
                            {p.requests > 0
                              ? `${p.requests} req · ${p.avgLatency}ms avg · ${p.errors > 0 ? `${p.errors} err` : '0 err'}`
                              : `${p.type} · ${allModels.filter(m => m.providerId === p.id).length} models`}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={!online ? 'Offline' : stale ? 'Idle' : 'Online'}
                        size="small" color={!online ? 'default' : stale ? 'warning' : 'success'} variant="outlined"
                        sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem', fontWeight: 700 } }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ModelTrainingIcon fontSize="small" /> Models Status
            </Typography>
            {allModels.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No models</Typography>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Active', value: activeModels.length },
                      { name: 'Inactive', value: allModels.length - activeModels.length },
                    ]} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                      <Cell fill="#388e3c" /><Cell fill="#c62828" />
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#388e3c' }} /><Typography variant="caption">Active {activeModels.length}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#c62828' }} /><Typography variant="caption">Inactive {allModels.length - activeModels.length}</Typography></Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {[
                    { label: 'Free Models', value: freeModels.length, color: '#2e7d32' },
                    { label: 'Streaming Support', value: streamingModels.length, color: '#7b1fa2' },
                    { label: 'Vision Support', value: allModels.filter(m => m.supportsVision).length, color: '#1565c0' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: s.color }}>{s.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon fontSize="small" /> System Summary
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              {[
                { label: 'Prompt Tokens', value: periodStats.tokens.toLocaleString() },
                { label: 'Token Ratio (In:Out)', value: periodStats.tokens > 0 ? 'N/A' : 'N/A' },
                { label: 'Avg Latency', value: overview?.avgResponseTime ? `${overview.avgResponseTime.toFixed(0)}ms` : 'N/A' },
                { label: 'Error Rate', value: `${successRate}% success` },
                { label: 'Total Cost (est)', value: `$${periodStats.cost.toFixed(4)}` },
                { label: 'Live Refresh', value: `Every ${REFRESH_INTERVAL / 1000}s` },
              ].map((s, i) => (
                <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between', mt: i > 0 ? 1 : 0 }}>
                  {s.label} <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{s.value}</Box>
                </Typography>
              ))}
            </Paper>
            {activeProviders.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }} action={<Chip label="Setup" size="small" color="warning" onClick={() => navigate('/providers')} sx={{ cursor: 'pointer' }} />}>
                No providers configured. Add providers to start using AI models.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LeaderboardIcon fontSize="small" color="primary" /> AI Model Performance Leaderboard
          </Typography>
          <Chip label="Based on recent requests" size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
        </Box>
        {leaderboard.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No successful requests recorded yet</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {leaderboard.map((m, i) => {
              const maxReq = leaderboard[0]?.requests || 1;
              const medal = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'transparent';
              return (
                <Box key={m.model} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: medal === 'transparent' ? 'action.hover' : medal, color: medal === 'transparent' ? 'text.secondary' : '#1a2233', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                    {i + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.model}</Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, ml: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{m.requests} req</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{m.avgLatency}ms</Typography>
                        {m.costPer1k > 0 && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>${m.costPer1k.toFixed(4)}/1K</Typography>}
                      </Box>
                    </Box>
                    <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${(m.requests / maxReq) * 100}%`, bgcolor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'primary.main', borderRadius: 3, transition: 'width 0.5s' }} />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      <Dialog open={budgetDialogOpen} onClose={() => setBudgetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Monthly Budget Alert</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set a monthly budget. The dashboard will warn at 80% and alert when the last-30-days spend exceeds it.
          </Typography>
          <TextField
            fullWidth size="small" type="number" autoFocus label="Budget (USD)" value={budgetInput}
            onChange={e => setBudgetInput(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            size="small" color="error" startIcon={<ClearIcon />}
            onClick={() => { setBudget(0); localStorage.removeItem('dashboard_budget'); setBudgetDialogOpen(false); }}
          >
            Clear
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<SettingsSuggestIcon />}
            onClick={() => {
              const v = parseFloat(budgetInput);
              if (!isNaN(v) && v > 0) { setBudget(v); localStorage.setItem('dashboard_budget', String(v)); }
              setBudgetDialogOpen(false);
            }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};