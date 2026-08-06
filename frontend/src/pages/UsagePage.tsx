import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TablePagination, alpha, Avatar, Divider,
} from '@mui/material';
import { usage, logs } from '../api/endpoints';
import type { UsageSummary, UsageChart, AuditLog, UsageRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaymentsIcon from '@mui/icons-material/Payments';
import TokenIcon from '@mui/icons-material/Token';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SpeedIcon from '@mui/icons-material/Speed';
import SavingsIcon from '@mui/icons-material/Savings';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';

export const UsagePage = () => {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [charts, setCharts] = useState<UsageChart[]>([]);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [logEntries, setLogEntries] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    Promise.all([
      usage.summary(),
      usage.charts(30),
      usage.records(1, 200).catch(() => ({ data: [] as UsageRecord[] })),
      logs.getAll(1, 50),
    ]).then(([s, c, r, l]) => {
      setSummary(s.data);
      setCharts(c.data);
      setRecords(r.data);
      setLogEntries(l.data);
    });
  }, []);

  const chartData = useMemo(() => charts.map(c => ({ ...c, date: new Date(c.date).toLocaleDateString() })), [charts]);
  const displayLogs = logEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const forecast = useMemo(() => {
    const days = charts.length;
    if (days === 0) return null;
    const avgReq = charts.reduce((s, c) => s + c.requestCount, 0) / days;
    const avgTok = charts.reduce((s, c) => s + c.tokenCount, 0) / days;
    const avgCost = charts.reduce((s, c) => s + (c.cost || 0), 0) / days;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remaining = Math.max(0, lastDay - now.getDate());
    return {
      avgReq: Math.round(avgReq),
      avgTok: Math.round(avgTok),
      avgCost,
      projectedRequests: Math.round(avgReq * (days + remaining)),
      projectedTokens: Math.round(avgTok * (days + remaining)),
      projectedCost: avgCost * (days + remaining),
      remaining,
    };
  }, [charts]);

  const costInsights = useMemo(() => {
    const perModel = Object.entries(
      records.filter(r => r.isSuccess).reduce<Record<string, { requests: number; tokens: number; cost: number; errors: number }>>((acc, r) => {
        const k = r.modelName ?? 'Unknown';
        const e = acc[k] ?? { requests: 0, tokens: 0, cost: 0, errors: 0 };
        e.requests += 1;
        e.tokens += r.totalTokens || 0;
        e.cost += r.cost || 0;
        acc[k] = e;
        return acc;
      }, {}),
    ).map(([model, s]) => ({
      model,
      requests: s.requests,
      tokens: s.tokens,
      cost: s.cost,
      avgCostPerReq: s.requests ? s.cost / s.requests : 0,
      costPer1k: s.tokens ? (s.cost / s.tokens) * 1000 : 0,
    })).filter(m => m.tokens > 0 && m.cost > 0).sort((a, b) => b.costPer1k - a.costPer1k);

    const mostExpensive = perModel[0];
    const cheapest = perModel.length ? perModel.reduce((a, b) => (b.costPer1k < a.costPer1k ? b : a)) : null;
    const recommendations: { title: string; body: string; icon: React.ReactNode; tone: 'success' | 'warning' | 'info' }[] = [];

    if (mostExpensive && cheapest && mostExpensive.model !== cheapest.model) {
      recommendations.push({
        title: `Consider ${cheapest.model} for high-volume calls`,
        body: `${mostExpensive.model} costs $${mostExpensive.costPer1k.toFixed(4)}/1K tokens vs $${cheapest.costPer1k.toFixed(4)}/1K on ${cheapest.model} — up to ${Math.max(1, Math.round((mostExpensive.costPer1k / Math.max(0.000001, cheapest.costPer1k))))}x cheaper for similar output.`,
        icon: <SavingsIcon />,
        tone: 'success',
      });
    }
    const costShare = perModel.reduce((s, m) => s + m.cost, 0);
    if (mostExpensive && costShare > 0 && mostExpensive.cost / costShare > 0.4) {
      recommendations.push({
        title: `${mostExpensive.model} drives ${(mostExpensive.cost / costShare * 100).toFixed(0)}% of spend`,
        body: `A single model accounts for most of your cost. Route low-priority traffic to a cheaper model to control spend.`,
        icon: <PaymentsIcon />,
        tone: 'warning',
      });
    }
    const errRate = records.length ? (records.filter(r => !r.isSuccess).length / records.length) * 100 : 0;
    if (errRate > 5) {
      recommendations.push({
        title: `Error rate at ${errRate.toFixed(1)}%`,
        body: `Check rate limits and provider health — errors waste tokens and budget. Review the request logs below or the live status on the dashboard.`,
        icon: <SpeedIcon />,
        tone: 'warning',
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        title: 'No optimization opportunities right now',
        body: 'Your usage looks efficient. Keep monitoring cost per 1K tokens across models as traffic grows.',
        icon: <LightbulbIcon />,
        tone: 'info',
      });
    }
    return { perModel, recommendations };
  }, [records]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Usage & Forecasting</Typography>
          <Typography variant="caption" color="text.secondary">Track consumption, forecast spend, and optimize model costs</Typography>
        </Box>
        {forecast && (
          <Chip icon={<TrendingUpIcon />} label={`Projected month-end: $${forecast.projectedCost.toFixed(2)}`} color="primary" size="small" sx={{ fontWeight: 700 }} />
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summary && [
          { label: 'Total Requests', value: summary.totalRequests.toLocaleString(), color: '#f57c00', icon: <RequestQuoteIcon /> },
          { label: "Today's Requests", value: summary.todayRequests.toLocaleString(), color: '#7b1fa2', icon: <RequestQuoteIcon /> },
          { label: 'Prompt Tokens', value: summary.promptTokens.toLocaleString(), color: '#1976d2', icon: <TokenIcon /> },
          { label: 'Completion Tokens', value: summary.completionTokens.toLocaleString(), color: '#388e3c', icon: <TokenIcon /> },
          { label: 'Total Cost', value: `$${summary.totalCost.toFixed(4)}`, color: '#c62828', icon: <PaymentsIcon /> },
          { label: 'Errors', value: summary.errors, color: '#d32f2f', icon: <SpeedIcon /> },
        ].map((c, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
            <Card sx={{ borderTop: 3, borderColor: c.color }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar sx={{ bgcolor: alpha(c.color, 0.12), color: c.color, width: 32, height: 32, mx: 'auto', mb: 0.5 }}>{c.icon}</Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{c.value}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{c.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon fontSize="small" /> Daily Usage (30 days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis />
                <ReTooltip />
                <Legend />
                <Bar dataKey="requestCount" fill="#1976d2" name="Requests" radius={[3, 3, 0, 0]} />
                <Bar dataKey="tokenCount" fill="#388e3c" name="Tokens" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon fontSize="small" color="primary" /> Usage Forecast
            </Typography>
            {!forecast ? (
              <Typography variant="body2" color="text.secondary">No data to forecast yet.</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { label: 'Daily avg requests', value: forecast.avgReq.toLocaleString() },
                    { label: 'Daily avg tokens', value: forecast.avgTok.toLocaleString() },
                    { label: 'Daily avg cost', value: `$${forecast.avgCost.toFixed(4)}` },
                    { label: 'Days remaining this month', value: forecast.remaining },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{s.value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>Projected month-end</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>${forecast.projectedCost.toFixed(2)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{forecast.projectedRequests.toLocaleString()} req · {forecast.projectedTokens.toLocaleString()} tok</Typography>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LightbulbIcon fontSize="small" color="warning" /> Cost Optimizer Recommendations
        </Typography>
        <Grid container spacing={1.5}>
          {costInsights.recommendations.map((r, i) => (
            <Grid size={{ xs: 12, md: 4 }} key={i}>
              <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderLeft: 4, borderColor: r.tone === 'success' ? 'success.main' : r.tone === 'warning' ? 'warning.main' : 'info.main', bgcolor: (t) => alpha(t.palette[r.tone].main, 0.04) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Avatar sx={{ width: 26, height: 26, bgcolor: alpha('#ed6c02', 0.12), color: '#ed6c02' }}>{r.icon}</Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{r.title}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{r.body}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {costInsights.perModel.length > 0 && (
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Requests</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                  <TableCell align="right">Total Cost</TableCell>
                  <TableCell align="right">Cost / Request</TableCell>
                  <TableCell align="right">Cost / 1K tokens</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costInsights.perModel.slice(0, 8).map(m => (
                  <TableRow key={m.model} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{m.model}</TableCell>
                    <TableCell align="right">{m.requests.toLocaleString()}</TableCell>
                    <TableCell align="right">{m.tokens.toLocaleString()}</TableCell>
                    <TableCell align="right">${m.cost.toFixed(4)}</TableCell>
                    <TableCell align="right">${m.avgCostPerReq.toFixed(4)}</TableCell>
                    <TableCell align="right"><Chip label={`$${m.costPer1k.toFixed(4)}`} size="small" color="warning" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem', fontWeight: 700 } }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>Recent Request Logs</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Shows the latest API requests with the action, entity, user, and timestamp.
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity / Model</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayLogs.map((log, i) => (
                <TableRow key={log.id || i} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{log.userEmail || '-'}</TableCell>
                  <TableCell><Chip label={log.action} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem' } }} /></TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.entity || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.action?.includes('Error') || log.action?.includes('Failed') ? 'Error' : 'Success'}
                      size="small" color={log.action?.includes('Error') || log.action?.includes('Failed') ? 'error' : 'success'}
                      variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem' } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {displayLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>No request logs available</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={logEntries.length} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} rowsPerPageOptions={[rowsPerPage]}
        />
      </Paper>
    </Box>
  );
};
