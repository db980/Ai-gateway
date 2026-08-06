import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, CircularProgress, Alert,
  Select, MenuItem, Stack, InputAdornment, IconButton, Tooltip, FormControlLabel, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import DeleteIcon from '@mui/icons-material/Delete';
import Checkbox from '@mui/material/Checkbox';
import { apiKeys, models } from '../api/endpoints';
import { ApiKey, ApiKeyFull, CreateApiKeyRequest, AIModel } from '../types';

export const ApiKeysPage = () => {
  const [data, setData] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState<ApiKeyFull | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState<CreateApiKeyRequest>({ name: '', restrictToActiveModels: false });
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [allModels, setAllModels] = useState<AIModel[]>([]);
  const [allowedSet, setAllowedSet] = useState<Set<string>>(new Set());
  const [modelSearch, setModelSearch] = useState('');
  const [savingModels, setSavingModels] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    models.getAll().then(r => setAllModels(r.data)).catch(() => {});
  }, []);

  const load = async () => {
    try { const { data: d } = await apiKeys.getAll(); setData(d); }
    catch { setError('Failed to load API keys'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try { const { data: d } = await apiKeys.create(form); setNewKey(d); setOpen(false); await load(); }
    catch { setError('Failed to create key'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await apiKeys.delete(deleteTarget.id); setDeleteTarget(null); await load(); }
    catch { setError('Failed to delete key'); }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const selectKey = (keyId: string) => {
    setSelectedKeyId(keyId);
    setModelSearch('');
    if (!keyId) { setAllowedSet(new Set()); return; }
    const key = data.find(k => k.id === keyId);
    setAllowedSet(new Set(key?.allowedModelIds?.split(',').filter(Boolean) ?? []));
  };

  const toggleAllowedModel = (modelId: string | undefined) => {
    if (!modelId || !selectedKeyId) return;
    const next = new Set(allowedSet);
    if (next.has(modelId)) next.delete(modelId); else next.add(modelId);
    setAllowedSet(next);
  };

  const selectAllActive = () => {
    if (!selectedKeyId) return;
    const allSelected = activeModels.length > 0 && activeModels.every(m => allowedSet.has(m.id));
    setAllowedSet(allSelected ? new Set() : new Set(activeModels.map(m => m.id)));
  };

  const saveModelAccess = async () => {
    if (!selectedKeyId) return;
    setSavingModels(true);
    setError('');
    try {
      await apiKeys.setAllowedModels(selectedKeyId, [...allowedSet]);
      setData(prev => prev.map(k => k.id === selectedKeyId ? { ...k, allowedModelIds: allowedSet.size ? [...allowedSet].join(',') : undefined } : k));
    } catch { setError('Failed to update model access'); }
    finally { setSavingModels(false); }
  };

  if (loading) return <CircularProgress />;

  const filteredData = data.filter(k => {
    if (search && !k.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && k.status !== filterStatus) return false;
    return true;
  });

  const activeModels = allModels.filter(m => m.status === 'Active');
  const filteredModels = activeModels.filter(m =>
    !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
    (m.alternativeModelName ?? '').toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.providerName.toLowerCase().includes(modelSearch.toLowerCase()));

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>API Keys</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Search keys..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 220 }} />
        <Select size="small" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
          <MenuItem value="Revoked">Revoked</MenuItem>
        </Select>
        <Typography variant="body2" color="text.secondary">{filteredData.length} of {data.length}</Typography>
        <Select size="small" value={selectedKeyId} onChange={e => selectKey(e.target.value)} displayEmpty sx={{ minWidth: 200 }}>
          <MenuItem value="">Select API key to manage model access</MenuItem>
          {data.map(k => <MenuItem key={k.id} value={k.id}>{k.name || k.prefix}</MenuItem>)}
        </Select>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Generate Key</Button>
      </Stack>
      {newKey && (
        <Alert severity="success" sx={{ mb: 2 }} action={<Button size="small" onClick={() => copyToClipboard(newKey.key)}>Copy</Button>}>
          Your new API key: <strong>{newKey.key}</strong> - Save this, it won't be shown again!
        </Alert>
      )}
      {selectedKeyId && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Allow this key to use these models
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center' }}>
            <TextField size="small" placeholder="Search models..." value={modelSearch}
              onChange={e => setModelSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              sx={{ minWidth: 240 }} />
            <Typography variant="body2" color="text.secondary">
              {allowedSet.size} of {activeModels.length} active models selected
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" variant="contained" disabled={savingModels}
              onClick={saveModelAccess}>
              {savingModels ? 'Saving...' : 'Save model access'}
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', color: 'text.secondary' } }}>
                  <TableCell>
                    <Checkbox size="small"
                      checked={activeModels.length > 0 && activeModels.every(m => allowedSet.has(m.id))}
                      indeterminate={activeModels.some(m => allowedSet.has(m.id)) && !activeModels.every(m => allowedSet.has(m.id))}
                      disabled={activeModels.length === 0}
                      onChange={selectAllActive} />
                  </TableCell><TableCell>Model</TableCell><TableCell>Provider</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredModels.map(m => {
                  const checked = allowedSet.has(m.id);
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Checkbox size="small" checked={checked}
                          onChange={() => toggleAllowedModel(m.id)} />
                      </TableCell>
                      <TableCell>
                        <Chip label={m.name} size="small" variant="outlined" color={checked ? 'success' : 'default'} />
                        {m.alternativeModelName && <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>alias: {m.alternativeModelName}</Typography>}
                      </TableCell>
                      <TableCell>{m.providerName}</TableCell>
                    </TableRow>
                  );
                })}
                {filteredModels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Alert severity="info">{activeModels.length === 0 ? 'No active models available.' : 'No models match your search.'}</Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Name</TableCell><TableCell>Prefix</TableCell><TableCell>Status</TableCell><TableCell>Models</TableCell><TableCell>Expires</TableCell><TableCell>Tokens Used</TableCell><TableCell>Cost</TableCell><TableCell>Created</TableCell><TableCell align="right">Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((k) => {
              const modelCount = k.allowedModelIds?.split(',').filter(Boolean).length ?? 0;
              return (
              <TableRow key={k.id}>
                <TableCell>{k.name ?? '-'}</TableCell>
                <TableCell><Chip label={k.prefix} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={k.status} color={k.status === 'Active' ? 'success' : 'default'} size="small" /></TableCell>
                <TableCell>
                  {modelCount > 0
                    ? <Chip label={`${modelCount} models`} color="primary" size="small" variant="outlined" />
                    : <Chip label="All" size="small" variant="outlined" sx={{ opacity: 0.6 }} />}
                  {k.restrictToActiveModels && <Chip label="Active only" color="info" size="small" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                <TableCell>{k.usedTokens.toLocaleString()}</TableCell>
                <TableCell>{k.cost != null ? `$${k.cost.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '-'}</TableCell>
                <TableCell>{new Date(k.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Copy key ID">
                    <IconButton size="small" onClick={() => copyToClipboard(k.id)}><ContentCopyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Copy full key">
                    <IconButton size="small" color="primary" onClick={async () => {
                      try {
                        const { data: full } = await apiKeys.get(k.id);
                        await copyToClipboard(full.key);
                      } catch { setError('Failed to fetch full key'); }
                    }}><KeyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete key">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(k)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate API Key</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Key Name (optional)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mt: 2 }} />
          <FormControlLabel
            control={<Switch checked={form.restrictToActiveModels ?? false} onChange={e => setForm({ ...form, restrictToActiveModels: e.target.checked })} />}
            label="Restrict to active models"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Generate</Button></DialogActions>
      </Dialog>
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete key <strong>{deleteTarget?.prefix}</strong>? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="contained" color="error" onClick={handleDelete}>Delete</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
