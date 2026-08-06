import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, TextField, MenuItem, Select, Grid, Chip, alpha, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, InputAdornment, Slider,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import TokenIcon from '@mui/icons-material/Token';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { models as modelsApi, usage } from '../api/endpoints';
import type { AIModel, UsageRecord } from '../types';

interface Rate { model: string; inputPer1k: number; outputPer1k: number; records: number; }

export const CostCalculatorPage = () => {
  const [modelList, setModelList] = useState<AIModel[]>([]);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [inputTokens, setInputTokens] = useState(1000);
  const [outputTokens, setOutputTokens] = useState(500);
  const [requests, setRequests] = useState(1);
  const [margin, setMargin] = useState(0);

  useEffect(() => {
    Promise.all([
      modelsApi.getAll().catch(() => ({ data: [] as AIModel[] })),
      usage.records(1, 500).catch(() => ({ data: [] as UsageRecord[] })),
    ]).then(([m, r]) => {
      setModelList(m.data);
      setRecords(r.data);
      if (m.data.length > 0) setSelectedModel(prev => prev || m.data[0].name);
    });
  }, []);

  const rates = useMemo<Rate[]>(() => {
    const byModel = Object.entries(
      records.filter(r => r.isSuccess && (r.cost ?? 0) > 0).reduce<Record<string, { cost: number; inTokens: number; outTokens: number; n: number }>>((acc, r) => {
        const k = r.modelName ?? 'Unknown';
        const e = acc[k] ?? { cost: 0, inTokens: 0, outTokens: 0, n: 0 };
        e.cost += r.cost ?? 0;
        e.inTokens += r.promptTokens;
        e.outTokens += r.completionTokens;
        e.n += 1;
        acc[k] = e;
        return acc;
      }, {}),
    ).map(([model, s]) => ({
      model,
      records: s.n,
      inputPer1k: s.inTokens > 0 ? (s.cost * (s.inTokens / Math.max(1, s.inTokens + s.outTokens)) / s.inTokens) * 1000 : 0,
      outputPer1k: s.outTokens > 0 ? (s.cost * (s.outTokens / Math.max(1, s.inTokens + s.outTokens)) / s.outTokens) * 1000 : 0,
    }));
    return byModel.sort((a, b) => a.inputPer1k + a.outputPer1k - (b.inputPer1k + b.outputPer1k));
  }, [records]);

  const selected = rates.find(r => r.model === selectedModel) ?? null;
  const fallbackIn = 0.0005;
  const fallbackOut = 0.0015;

  const inRate = selected?.inputPer1k || fallbackIn;
  const outRate = selected?.outputPer1k || fallbackOut;
  const rawCost = (inputTokens / 1000) * inRate * requests + (outputTokens / 1000) * outRate * requests;
  const totalCost = rawCost * (1 + margin / 100);
  const priceDisplay = selected
    ? `Measured $${inRate.toFixed(5)} / 1K in · $${outRate.toFixed(5)} / 1K out`
    : 'No measured data — using default estimate (input $0.0005, output $0.0015 per 1K)';

  return (
    <Box>
      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalculateIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Token Cost Calculator</Typography>
            <Typography variant="caption" color="text.secondary">Estimate request costs from your real, measured model rates</Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <RequestQuoteIcon fontSize="small" /> Parameters
            </Typography>
            <Select fullWidth size="small" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} displayEmpty sx={{ mb: 2 }}>
              <MenuItem value="" disabled>Select a model</MenuItem>
              {rates.length > 0
                ? rates.map(r => <MenuItem key={r.model} value={r.model}>{r.model} ({r.records} req)</MenuItem>)
                : modelList.map(m => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              Input tokens <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{inputTokens.toLocaleString()}</Box>
            </Typography>
            <Slider size="small" min={1} max={200000} step={100} value={inputTokens} onChange={(_, v) => setInputTokens(v as number)} sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              Output tokens <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{outputTokens.toLocaleString()}</Box>
            </Typography>
            <Slider size="small" min={1} max={200000} step={100} value={outputTokens} onChange={(_, v) => setOutputTokens(v as number)} sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="Number of requests" type="number" value={requests}
              onChange={e => setRequests(Math.max(1, parseInt(e.target.value) || 1))}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><RequestQuoteIcon fontSize="small" /></InputAdornment> } }} sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              Margin (%) <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{margin}%</Box>
            </Typography>
            <Slider size="small" min={0} max={100} step={5} value={margin} onChange={(_, v) => setMargin(v as number)} />
            <Chip icon={<TokenIcon />} label={priceDisplay} size="small" variant="outlined" sx={{ mt: 2, height: 'auto', py: 0.5, '& .MuiChip-label': { fontSize: '0.68rem', whiteSpace: 'normal' } }} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoneyIcon fontSize="small" /> Estimated Cost
            </Typography>
            <Box sx={{
              flex: 1, borderRadius: 3, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.1)}, ${alpha(t.palette.secondary.main, 0.06)})`,
              border: '1px dashed', borderColor: 'primary.main',
            }}>
              <Typography variant="caption" color="text.secondary">Total for {requests.toLocaleString()} request{requests > 1 ? 's' : ''}</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', my: 1 }}>${totalCost.toFixed(4)}</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip label={`Input: $${((inputTokens / 1000) * inRate * requests).toFixed(4)}`} size="small" variant="outlined" />
                <Chip label={`Output: $${((outputTokens / 1000) * outRate * requests).toFixed(4)}`} size="small" variant="outlined" />
                <Chip label={`Per request: $${(totalCost / requests).toFixed(4)}`} size="small" variant="outlined" color="primary" />
              </Box>
              {margin > 0 && <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Includes {margin}% margin</Typography>}
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1.5 }}>
              Rates are measured averages from your actual usage history. Select a model that has been used to see real pricing.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TokenIcon fontSize="small" color="primary" /> Measured model rates (from usage)
        </Typography>
        {rates.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No paid usage yet — rates will appear after requests are recorded.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Input $ / 1K</TableCell>
                  <TableCell align="right">Output $ / 1K</TableCell>
                  <TableCell align="right">Blended $ / 1K</TableCell>
                  <TableCell align="right">Recorded requests</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rates.map(r => (
                  <TableRow key={r.model} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>{r.model}</TableCell>
                    <TableCell align="right">${r.inputPer1k.toFixed(5)}</TableCell>
                    <TableCell align="right">${r.outputPer1k.toFixed(5)}</TableCell>
                    <TableCell align="right"><Chip label={`$${((r.inputPer1k + r.outputPer1k) / 2).toFixed(5)}`} size="small" color="warning" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.65rem', fontWeight: 700 } }} /></TableCell>
                    <TableCell align="right">{r.records}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
