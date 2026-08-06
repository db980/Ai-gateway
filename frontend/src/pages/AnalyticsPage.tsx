import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Avatar, alpha, IconButton, Collapse, Divider, LinearProgress,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import TokenIcon from '@mui/icons-material/Token';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MemoryIcon from '@mui/icons-material/Memory';
import PublicIcon from '@mui/icons-material/Public';
import BarChartIcon from '@mui/icons-material/BarChart';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import HubIcon from '@mui/icons-material/Hub';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, AreaChart, Area, Legend, ComposedChart, Line,
} from 'recharts';
import { analytics, usage, providers as providersApi } from '../api/endpoints';
import type { AnalyticsOverview, UsageSummary, UsageChart, UsageRecord, Provider } from '../types';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828', '#00796b', '#1565c0', '#6a1b9a', '#2e7d32', '#e65100'];

const fmtCost = (c: number | null | undefined) => c != null ? `$${c.toFixed(6)}` : '-';
const fmtTime = (ms: number | null | undefined) => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

const StatCard = ({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) => (
  <Paper sx={{ p: 1.75, borderTop: 3, borderColor: color, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 34, height: 34, flexShrink: 0 }}>{icon}</Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{sub}</Typography>}
      </Box>
    </Box>
  </Paper>
);

const ActivityRow = ({ r }: { r: UsageRecord }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <TableCell sx={{ width: 34 }}>
          <IconButton size="small" sx={{ width: 24, height: 24 }}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Chip
            icon={r.isSuccess ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ErrorIcon sx={{ fontSize: 14 }} />}
            label={r.isSuccess ? 'Success' : 'Error'} size="small"
            color={r.isSuccess ? 'success' : 'error'}
            variant={r.isSuccess ? 'filled' : 'outlined'}
            sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem', px: 1, fontWeight: 600 } }}
          />
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.modelName ?? '-'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{r.providerName}</Typography>
        </TableCell>
        <TableCell align="right"><Typography variant="caption">{r.totalTokens.toLocaleString()} tok</Typography></TableCell>
        <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{fmtCost(r.cost)}</Typography></TableCell>
        <TableCell align="right"><Chip label={fmtTime(r.latencyMs)} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem' } }} /></TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="caption">{new Date(r.createdAt).toLocaleString()}</Typography></TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, bgcolor: (t) => alpha(t.palette.action.hover, 0.4) }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2 }}>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  { icon: <SmartToyIcon sx={{ fontSize: 16 }} />, label: 'Model', value: r.modelName ?? '-' },
                  { icon: <CloudDoneIcon sx={{ fontSize: 16 }} />, label: 'Provider', value: r.providerName ?? '-' },
                  { icon: <MemoryIcon sx={{ fontSize: 16 }} />, label: 'Prompt Tokens', value: r.promptTokens.toLocaleString() },
                  { icon: <TokenIcon sx={{ fontSize: 16 }} />, label: 'Completion Tokens', value: r.completionTokens.toLocaleString() },
                  { icon: <TokenIcon sx={{ fontSize: 16 }} />, label: 'Total Tokens', value: r.totalTokens.toLocaleString() },
                  { icon: <PaymentsIcon sx={{ fontSize: 16 }} />, label: 'Cost', value: fmtCost(r.cost) },
                  { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, label: 'Latency', value: fmtTime(r.latencyMs) },
                  { icon: <PublicIcon sx={{ fontSize: 16 }} />, label: 'IP', value: r.ipAddress ?? '-' },
                ].map((d, i) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={i}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1.5, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ color: 'primary.main', display: 'flex' }}>{d.icon}</Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.55rem', textTransform: 'uppercase' }}>{d.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.value}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} /> Request Input
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: 'background.default', borderRadius: 1.5, maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', m: 0 }}>
                  {r.requestContent || 'No request content recorded'}
                </Typography>
              </Paper>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} /> Response Output
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', m: 0 }}>
                  {r.responseContent || 'No response content recorded'}
                </Typography>
              </Paper>
              {r.errorMessage && (
                <Paper elevation={0} sx={{ p: 1.5, mt: 2, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.error.main, 0.06), border: '1px solid', borderColor: (t) => alpha(t.palette.error.main, 0.3) }}>
                  <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ErrorIcon sx={{ fontSize: 14 }} /> {r.errorMessage}
                  </Typography>
                </Paper>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const AnalyticsPage = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [charts, setCharts] = useState<UsageChart[]>([]);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, s, c, r, p] = await Promise.all([
          analytics.overview().then(x => x.data),
          usage.summary().then(x => x.data),
          usage.charts(30).then(x => x.data),
          usage.records(1, 200, undefined, true).then(x => x.data),
          providersApi.getAll().then(x => x.data),
        ]);
        setOverview(o); setSummary(s); setCharts(c); setRecords(r); setProviders(p);
      } catch { setError('Failed to load analytics'); }
      finally { setLoading(false); }
    })();
  }, []);

  const chartData = useMemo(() => charts.map(c => ({
    date: new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    requests: c.requestCount,
    tokens: c.tokenCount,
    cost: parseFloat(c.cost.toFixed(6)),
  })), [charts]);

  const statusSeries = useMemo(() => {
    const byDay = records.reduce<Record<string, { date: string; success: number; error: number }>>((acc, r) => {
      const d = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = acc[d] ?? { date: d, success: 0, error: 0 };
      if (r.isSuccess) e.success += 1; else e.error += 1;
      acc[d] = e;
      return acc;
    }, {});
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  const perModel = useMemo(() => Object.entries(
    records.reduce<Record<string, { requests: number; success: number; tokens: number; cost: number; lat: number[] }>>((acc, r) => {
      const k = r.modelName ?? 'Unknown';
      const e = acc[k] ?? { requests: 0, success: 0, tokens: 0, cost: 0, lat: [] };
      e.requests += 1;
      if (r.isSuccess) e.success += 1;
      e.tokens += r.totalTokens || 0;
      e.cost += r.cost || 0;
      if (r.latencyMs) e.lat.push(r.latencyMs);
      acc[k] = e;
      return acc;
    }, {}),
  ).map(([model, s]) => ({
    model,
    requests: s.requests,
    errors: s.requests - s.success,
    successRate: s.requests ? Math.round((s.success / s.requests) * 100) : 0,
    tokens: s.tokens,
    cost: s.cost,
    costPer1k: s.tokens ? (s.cost / s.tokens) * 1000 : 0,
    avgLatency: s.lat.length ? Math.round(s.lat.reduce((a, b) => a + b, 0) / s.lat.length) : 0,
  })).sort((a, b) => b.requests - a.requests).slice(0, 10), [records]);

  const perProvider = useMemo(() => Object.entries(
    records.reduce<Record<string, { requests: number; success: number; tokens: number; cost: number; lat: number[] }>>((acc, r) => {
      const k = r.providerName ?? 'Unknown';
      const e = acc[k] ?? { requests: 0, success: 0, tokens: 0, cost: 0, lat: [] };
      e.requests += 1;
      if (r.isSuccess) e.success += 1;
      e.tokens += r.totalTokens || 0;
      e.cost += r.cost || 0;
      if (r.latencyMs) e.lat.push(r.latencyMs);
      acc[k] = e;
      return acc;
    }, {}),
  ).map(([name, s]) => ({
    name,
    requests: s.requests,
    errors: s.requests - s.success,
    tokens: s.tokens,
    cost: s.cost,
    avgLatency: s.lat.length ? Math.round(s.lat.reduce((a, b) => a + b, 0) / s.lat.length) : 0,
  })).sort((a, b) => b.requests - a.requests), [records]);

  const maxModelReq = perModel.length ? perModel[0].requests : 1;
  const maxProviderReq = perProvider.length ? perProvider[0].requests : 1;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalCost = (overview?.totalRevenue ?? 0) > 0 ? overview!.totalRevenue : (summary?.totalCost ?? 0);
  const errorRate = summary && summary.totalRequests > 0 ? ((summary.errors / summary.totalRequests) * 100).toFixed(1) : '0';
  const successRate = summary && summary.totalRequests > 0 ? ((1 - summary.errors / summary.totalRequests) * 100).toFixed(1) : '100.0';
  const avgTokensPerReq = summary && summary.totalRequests > 0 ? Math.round(summary.totalTokens / summary.totalRequests).toLocaleString() : 'N/A';
  const costPer1k = summary && summary.totalTokens > 0 ? (summary.totalCost / summary.totalTokens) * 1000 : 0;
  const activeProviders = providers.filter(p => p.isActive);

  const statCards = [
    { icon: <BarChartIcon />, label: 'Total Requests', value: (overview?.totalRequests ?? summary?.totalRequests ?? 0).toLocaleString(), color: '#1976d2' },
    { icon: <CheckCircleIcon />, label: "Today's Requests", value: (summary?.todayRequests ?? 0).toLocaleString(), color: '#388e3c' },
    { icon: <HubIcon />, label: 'Active Providers', value: `${activeProviders.length}/${providers.length}`, color: '#2e7d32', sub: `${providers.length - activeProviders.length} inactive` },
    { icon: <TokenIcon />, label: 'Total Tokens', value: (overview?.totalTokens ?? summary?.totalTokens ?? 0).toLocaleString(), color: '#e65100' },
    { icon: <MemoryIcon />, label: 'Prompt Tokens', value: (summary?.promptTokens ?? 0).toLocaleString(), color: '#0288d1' },
    { icon: <TokenIcon />, label: 'Completion Tokens', value: (summary?.completionTokens ?? 0).toLocaleString(), color: '#2e7d32' },
    { icon: <PaymentsIcon />, label: 'Total Cost', value: `$${totalCost.toFixed(4)}`, color: '#c62828' },
    { icon: <ScheduleIcon />, label: 'Avg Response Time', value: overview ? `${overview.avgResponseTime.toFixed(0)}ms` : 'N/A', color: '#00695c' },
    { icon: <ErrorIcon />, label: 'Errors', value: (summary?.errors ?? 0).toLocaleString(), color: '#d32f2f' },
    { icon: <AnalyticsIcon />, label: 'Error Rate', value: `${errorRate}%`, color: '#f57c00' },
    { icon: <BarChartIcon />, label: 'Avg Tokens/Request', value: avgTokensPerReq, color: '#6a1b9a' },
    { icon: <PaymentsIcon />, label: 'Cost / 1K tokens', value: `$${costPer1k.toFixed(4)}`, color: '#1565c0' },
  ];

  const recentSuccess = records.filter(r => r.isSuccess).slice(0, 12);
  const recentErrors = records.filter(r => !r.isSuccess).slice(0, 12);

  return (
    <Box>
      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnalyticsIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Analytics</Typography>
            <Typography variant="caption" color="text.secondary">Deep-dive into usage, spend, model and provider performance · {successRate}% success overall</Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {statCards.map((c, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Requests Over Time (30d)</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <ReTooltip />
                <Bar dataKey="requests" fill="#1976d2" radius={[4, 4, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Token Usage</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <ReTooltip />
                <Area type="monotone" dataKey="tokens" stroke="#2e7d32" fill="#4caf50" fillOpacity={0.15} strokeWidth={2} name="Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Cost Over Time</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <ReTooltip formatter={(v: any) => `$${typeof v === 'number' ? v.toFixed(4) : v}`} />
                <Bar dataKey="cost" fill="#c62828" radius={[4, 4, 0, 0]} name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Success vs Errors (sampled)</Typography>
            {statusSeries.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No records to chart</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={statusSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ReTooltip />
                  <Legend />
                  <Bar dataKey="success" stackId="a" fill="#2e7d32" radius={[3, 3, 0, 0]} name="Success" />
                  <Bar dataKey="error" stackId="a" fill="#d32f2f" radius={[3, 3, 0, 0]} name="Errors" />
                  <Line type="monotone" dataKey="success" stroke="#1976d2" dot={false} hide />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Model Performance Breakdown</Typography>
            {perModel.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No usage data yet</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Model</TableCell>
                      <TableCell align="right">Requests</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                      <TableCell align="right">Tokens</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">$/1K</TableCell>
                      <TableCell align="right">Avg Latency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {perModel.map((m, i) => (
                      <TableRow key={m.model} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: alpha(COLORS[i % COLORS.length], 0.15), color: COLORS[i % COLORS.length] }}>
                              {m.model[0]?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{m.model}</Typography>
                              <Box sx={{ width: 120, mt: 0.25 }}>
                                <LinearProgress variant="determinate" value={(m.requests / maxModelReq) * 100} sx={{ height: 3, borderRadius: 3, bgcolor: 'action.hover' }} color={m.errors > 0 ? 'warning' : 'primary'} />
                              </Box>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{m.requests.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Chip label={`${m.successRate}%`} size="small" color={m.successRate >= 90 ? 'success' : m.successRate >= 70 ? 'warning' : 'error'} variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem', fontWeight: 700 } }} />
                        </TableCell>
                        <TableCell align="right">{m.tokens.toLocaleString()}</TableCell>
                        <TableCell align="right">{fmtCost(m.cost)}</TableCell>
                        <TableCell align="right"><Typography variant="caption" sx={{ fontWeight: 700 }}>${m.costPer1k.toFixed(4)}</Typography></TableCell>
                        <TableCell align="right">{fmtTime(m.avgLatency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Provider Breakdown</Typography>
            {perProvider.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No usage data yet</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {perProvider.map((p, i) => (
                  <Box key={p.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Chip
                          icon={p.errors > 0 ? <ErrorIcon sx={{ fontSize: 12 }} /> : <CheckCircleIcon sx={{ fontSize: 12 }} />}
                          label={p.name} size="small"
                          color={p.errors > 0 ? 'warning' : 'success'} variant="outlined"
                          sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' } }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{p.requests} req</Typography>
                    </Box>
                    <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${(p.requests / maxProviderReq) * 100}%`, bgcolor: COLORS[i % COLORS.length], borderRadius: 3 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.25 }}>
                      {p.tokens.toLocaleString()} tok · {fmtCost(p.cost)} · avg {fmtTime(p.avgLatency)} · {p.errors} errors
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudDoneIcon fontSize="small" color="success" /> Recent Activity
          </Typography>
          <Chip label="Click a row for full request/response content" size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
        </Box>
        {recentSuccess.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No recent activity</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 34 }} />
                  <TableCell>Status</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Latency</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSuccess.map(r => <ActivityRow key={r.id} r={r} />)}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {recentErrors.length > 0 && (
        <Paper sx={{ p: 2, borderColor: 'error.main', mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon fontSize="small" /> Recent Errors
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Full Error Message</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentErrors.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.78rem' }}>{r.modelName ?? '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{r.providerName ?? '-'}</TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'error.main', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                        {r.errorMessage ?? 'Unknown error'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography variant="caption">{new Date(r.createdAt).toLocaleString()}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};
