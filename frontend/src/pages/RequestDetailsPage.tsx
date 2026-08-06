import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Collapse, TablePagination, TextField, Select, MenuItem, InputAdornment,
  Chip, Divider, Tooltip, alpha, Grid, CircularProgress,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SearchIcon from '@mui/icons-material/Search';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import TokenIcon from '@mui/icons-material/Token';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import PublicIcon from '@mui/icons-material/Public';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CodeIcon from '@mui/icons-material/Code';
import { usage } from '../api/endpoints';
import type { UsageRecord } from '../types';

const downloadBlob = (content: string, type: string, name: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const escapeCsv = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const fmtBytes = (b: number | null | undefined) => {
  if (b == null) return '-';
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
};

const fmtCost = (c: number | null | undefined) => c != null ? `$${c.toFixed(6)}` : '-';

const estTokens = (text: string | null | undefined) => text ? Math.max(1, Math.round(text.length / 4)) : 0;

const fmtLen = (n: number) => {
  if (n < 1000) return `${n} ch`;
  if (n < 1000000) return `${(n / 1000).toFixed(1)}k ch`;
  return `${(n / 1000000).toFixed(2)}M ch`;
};

const fmtTime = (ms: number | null | undefined) => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

const latencyColor = (ms: number | null | undefined) => {
  if (ms == null) return 'default';
  if (ms < 2000) return 'success';
  if (ms < 10000) return 'warning';
  return 'error';
};

const StatCard = ({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) => (
  <Paper elevation={0} sx={{
    p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
    background: (t) => `linear-gradient(135deg, ${alpha(t.palette[color as 'primary']?.main ?? t.palette.primary.main, 0.06)}, ${alpha(t.palette.background.paper, 0.9)})`,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: (t) => alpha(t.palette[color as 'primary']?.main ?? t.palette.primary.main, 0.12),
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.62rem' }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
        {sub && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sub}</Typography>}
      </Box>
    </Box>
  </Paper>
);

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75, borderRadius: 1.5, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography>
    </Box>
  </Box>
);

const parseUtc = (s: string) => {
  const hasTz = /(Z|[+-]\d{2}:\d{2})$/i.test(s.trim());
  const d = new Date(hasTz ? s : `${s}Z`);
  return isNaN(d.getTime()) ? new Date() : d;
};

const Row = ({ r }: { r: UsageRecord }) => {
  const [open, setOpen] = useState(false);
  const time = useMemo(() => parseUtc(r.createdAt), [r.createdAt]);
  const rel = Math.floor((Date.now() - time.getTime()) / 1000);
  const relText = rel < 60 ? 'just now'
    : rel < 3600 ? `${Math.floor(rel / 60)}m ago`
    : rel < 86400 ? `${Math.floor(rel / 3600)}h ago`
    : `${Math.floor(rel / 86400)}d ago`;

  const total = Math.max(1, r.totalTokens || 1);
  const promptPct = Math.min(100, Math.round((r.promptTokens / total) * 100));

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer', bgcolor: open ? (t) => alpha(t.palette.primary.main, 0.04) : 'inherit' }} onClick={() => setOpen(!open)}>
        <TableCell sx={{ width: 36 }}>
          <IconButton size="small" sx={{ width: 26, height: 26 }}>
            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Chip
            icon={r.isSuccess ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ErrorIcon sx={{ fontSize: 14 }} />}
            label={r.isSuccess ? 'Success' : 'Error'}
            size="small"
            color={r.isSuccess ? 'success' : 'error'}
            variant={r.isSuccess ? 'filled' : 'outlined'}
            sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem', px: 1, fontWeight: 600 } }}
          />
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Box component="span" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{relText}</Box>
          <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
            {time.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 26, height: 26, borderRadius: 1.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (t) => alpha(t.palette.primary.main, 0.1) }}>
              <SmartToyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{r.modelName || '-'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>{r.providerName || ''}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ minWidth: 130 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>P {r.promptTokens.toLocaleString()}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>C {r.completionTokens.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.25 }}>
            <Box sx={{ height: 5, width: `${promptPct}%`, bgcolor: 'primary.main', borderRadius: '2px 0 0 2px' }} />
            <Box sx={{ height: 5, flex: 1, bgcolor: 'secondary.light', borderRadius: '0 2px 2px 0' }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{r.totalTokens.toLocaleString()} tokens</Typography>
        </TableCell>
        <TableCell align="right">
          <Chip label={fmtTime(r.latencyMs)} size="small" color={latencyColor(r.latencyMs)} variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem', px: 0.75 } }} />
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2" sx={{ fontWeight: r.cost != null ? 600 : 400 }}>{fmtCost(r.cost)}</Typography>
        </TableCell>
        <TableCell align="right">
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{fmtLen((r.requestContent || '').length)}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.62rem' }}>~{estTokens(r.requestContent).toLocaleString()} tokens</Typography>
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>{fmtBytes(r.requestSize)} / {fmtBytes(r.responseSize)}</Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PublicIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>{r.ipAddress || '-'}</Typography>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, bgcolor: (t) => alpha(t.palette.action.hover, 0.4) }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2.5 }}>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<SmartToyIcon sx={{ fontSize: 18 }} />} label="Model" value={r.modelName || '-'} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<CloudDoneIcon sx={{ fontSize: 18 }} />} label="Provider" value={r.providerName || '-'} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<MemoryIcon sx={{ fontSize: 18 }} />} label="Prompt Tokens" value={r.promptTokens.toLocaleString()} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<TokenIcon sx={{ fontSize: 18 }} />} label="Completion Tokens" value={r.completionTokens.toLocaleString()} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<StorageIcon sx={{ fontSize: 18 }} />} label="Input Length" value={`${fmtLen((r.requestContent || '').length)} (~${estTokens(r.requestContent).toLocaleString()} tokens)`} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<TokenIcon sx={{ fontSize: 18 }} />} label="Total Tokens" value={r.totalTokens.toLocaleString()} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<PaymentsIcon sx={{ fontSize: 18 }} />} label="Cost" value={fmtCost(r.cost)} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<ScheduleIcon sx={{ fontSize: 18 }} />} label="Latency" value={fmtTime(r.latencyMs)} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<StorageIcon sx={{ fontSize: 18 }} />} label="Request / Response" value={`${fmtBytes(r.requestSize)} / ${fmtBytes(r.responseSize)}`} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<PublicIcon sx={{ fontSize: 18 }} />} label="IP Address" value={r.ipAddress || '-'} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<ScheduleIcon sx={{ fontSize: 18 }} />} label="Created At" value={time.toLocaleString()} /></Grid>
                <Grid size={{ xs: 6, sm: 3 }}><DetailItem icon={<CheckCircleIcon sx={{ fontSize: 18 }} />} label="Status" value={r.isSuccess ? 'Success' : 'Error'} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><DetailItem icon={<StorageIcon sx={{ fontSize: 18 }} />} label="Request ID" value={r.id} /></Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} /> Request Input
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: 'background.default', borderRadius: 1.5, maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', m: 0 }}>
                  {r.requestContent || 'No request content recorded'}
                </Typography>
              </Paper>

              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} /> Response Output
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: 'background.default', borderRadius: 1.5, maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', m: 0 }}>
                  {r.responseContent || 'No response content recorded'}
                </Typography>
              </Paper>

              {r.errorMessage && (
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.error.main, 0.06), border: '1px solid', borderColor: (t) => alpha(t.palette.error.main, 0.3) }}>
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

export const RequestDetailsPage = () => {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [days, setDays] = useState(3);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvider, setFilterProvider] = useState('');

  const load = () => {
    setLoading(true);
    usage.records(page + 1, pageSize, days, true)
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, pageSize, days]);
  const providers = useMemo(() => [...new Set(records.map(r => r.providerName).filter((p): p is string => !!p))], [records]);

  const filteredData = useMemo(() => records.filter(r => {
    if (search && !r.modelName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'success' && !r.isSuccess) return false;
    if (filterStatus === 'error' && r.isSuccess) return false;
    if (filterProvider && r.providerName !== filterProvider) return false;
    return true;
  }), [records, search, filterStatus, filterProvider]);

  const successCount = filteredData.filter(r => r.isSuccess).length;
  const totalTokens = filteredData.reduce((s, r) => s + (r.totalTokens || 0), 0);
  const totalCost = filteredData.reduce((s, r) => s + (r.cost || 0), 0);
  const avgLatency = filteredData.length ? Math.round(filteredData.reduce((s, r) => s + (r.latencyMs || 0), 0) / filteredData.length) : 0;
  const successRate = filteredData.length ? Math.round((successCount / filteredData.length) * 100) : 0;

  const exportCsv = () => {
    const header = 'Time,Model,Provider,Prompt Tokens,Completion Tokens,Total Tokens,Cost,Latency (ms),Status,Error,IP';
    const rows = filteredData.map(r =>
      [new Date(r.createdAt).toISOString(), r.modelName, r.providerName, r.promptTokens, r.completionTokens, r.totalTokens, r.cost, r.latencyMs, r.isSuccess ? 'Success' : 'Error', r.errorMessage, r.ipAddress].map(escapeCsv).join(','));
    downloadBlob([header, ...rows].join('\n'), 'text/csv', `request-details-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportJson = () => {
    const payload = filteredData.map(r => ({
      id: r.id,
      createdAt: new Date(r.createdAt).toISOString(),
      modelName: r.modelName,
      providerName: r.providerName,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      cost: r.cost,
      latencyMs: r.latencyMs,
      isSuccess: r.isSuccess,
      errorMessage: r.errorMessage,
      ipAddress: r.ipAddress,
      requestSize: r.requestSize,
      responseSize: r.responseSize,
      requestContent: r.requestContent,
      responseContent: r.responseContent,
    }));
    downloadBlob(JSON.stringify(payload, null, 2), 'application/json', `request-details-${new Date().toISOString().slice(0, 10)}.json`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Request Details</Typography>
          <Typography variant="caption" color="text.secondary">Track every AI request · tokens, latency, cost and payloads</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh"><IconButton onClick={load} size="small"><RefreshIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Export CSV"><IconButton onClick={exportCsv} size="small" disabled={filteredData.length === 0}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Export JSON"><IconButton onClick={exportJson} size="small" disabled={filteredData.length === 0}><CodeIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<CheckCircleIcon sx={{ color: 'success.main' }} />} label="Success Rate" value={`${successRate}%`} sub={`${successCount} of ${filteredData.length}`} color="success" /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<TokenIcon sx={{ color: 'primary.main' }} />} label="Total Tokens" value={totalTokens.toLocaleString()} sub="in current view" color="primary" /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<PaymentsIcon sx={{ color: 'warning.main' }} />} label="Total Cost" value={fmtCost(totalCost)} sub="in current view" color="warning" /></Grid>
        <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={<ScheduleIcon sx={{ color: 'info.main' }} />} label="Avg Latency" value={fmtTime(avgLatency)} sub="response time" color="info" /></Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search model..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 2 } }} />
        <Select size="small" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} displayEmpty sx={{ minWidth: 130 }}>
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="success">Success</MenuItem>
          <MenuItem value="error">Error</MenuItem>
        </Select>
        <Select size="small" value={filterProvider} onChange={e => setFilterProvider(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          <MenuItem value="">All Providers</MenuItem>
          {providers.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </Select>
        <Select size="small" value={days} onChange={e => { setDays(Number(e.target.value)); setPage(0); }} sx={{ minWidth: 130 }}>
          <MenuItem value={1}>Last 1 day</MenuItem>
          <MenuItem value={3}>Last 3 days</MenuItem>
          <MenuItem value={7}>Last 7 days</MenuItem>
          <MenuItem value={30}>Last 30 days</MenuItem>
          <MenuItem value={90}>Last 90 days</MenuItem>
          <MenuItem value={3650}>All time</MenuItem>
        </Select>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing <Box component="span" sx={{ fontWeight: 700 }}>{filteredData.length}</Box> of {records.length}
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8, flexDirection: 'column', gap: 1.5 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Loading request details...</Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: (t) => alpha(t.palette.background.default, 0.6), fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' } }}>
                    <TableCell sx={{ width: 36 }} />
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Tokens</TableCell>
                    <TableCell align="right">Latency</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Input</TableCell>
                    <TableCell align="right">Size (req/resp)</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map(r => <Row key={r.id} r={r} />)}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <SmartToyIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.4 }} />
                          <Typography color="text.secondary">No requests found{records.length === 0 ? ' yet. Start chatting in the Playground to see details.' : ' matching your filters.'}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider />
            <TablePagination component="div" count={-1} page={page} onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize} onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50]} />
          </>
        )}
      </Paper>
    </Box>
  );
};
