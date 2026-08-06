import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, TablePagination, TextField, Select, MenuItem, Stack, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { logs } from '../api/endpoints';
import { AuditLog } from '../types';

export const LogsPage = () => {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    try { const r = await logs.getAll(page + 1); setData(r.data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (loading) return <CircularProgress />;

  const actions = [...new Set(data.map(l => l.action))];

  const filteredData = data.filter(l => {
    if (search && !l.action?.toLowerCase().includes(search.toLowerCase()) && !l.entity?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAction && l.action !== filterAction) return false;
    return true;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>Audit Logs</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 240 }} />
        <Select size="small" value={filterAction} onChange={e => setFilterAction(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          <MenuItem value="">All Actions</MenuItem>
          {actions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </Select>
        <Typography variant="body2" color="text.secondary">{filteredData.length} of {data.length}</Typography>
      </Stack>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>Date</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((l) => (
              <TableRow key={l.id}>
                <TableCell><Chip label={l.action} size="small" /></TableCell>
                <TableCell>{l.entity ?? '-'}</TableCell>
                <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={1000} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={50} rowsPerPageOptions={[50]} />
      </TableContainer>
    </Box>
  );
};
