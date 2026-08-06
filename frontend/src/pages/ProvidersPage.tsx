import { useEffect, useState, Fragment } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControlLabel, Switch, Chip, CircularProgress, Alert, IconButton, Collapse, Stack, InputAdornment, alpha, Avatar, Tooltip, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import HubIcon from '@mui/icons-material/Hub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SpeedIcon from '@mui/icons-material/Speed';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ClearIcon from '@mui/icons-material/Clear';
import KeyIcon from '@mui/icons-material/Key';
import StarIcon from '@mui/icons-material/Star';
import { providers, models, providerTypes as providerTypesApi, providerKeys as providerKeysApi } from '../api/endpoints';
import { Provider, CreateProviderRequest, UpdateProviderRequest, ModelItem, AIModel, ProviderType, ProviderApiKey, AddProviderKeyRequest } from '../types';

const defaultForm = (): CreateProviderRequest => ({
  name: '', baseUrl: '', apiKey: '', apiKeyExpiresAt: '', organization: '',
  rateLimit: undefined, timeout: undefined, isActive: true, priority: 0, models: [], type: 'CustomRESTAPI',
});

const typeIcon = (type: string) => {
  const map: Record<string, string> = {
    OpenAI: '🅾', Claude: '🅲', Gemini: '🅶', Groq: '🅶', Mistral: '🅼', Ollama: '🅾', DeepSeek: '🅳', OpenRouter: '🅾', Azure: '🅰', LMStudio: '🅻', CustomRESTAPI: '🆁',
  };
  return map[type] ?? '🆁';
};

export const ProvidersPage = () => {
  const [data, setData] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('active');
  const [form, setForm] = useState<CreateProviderRequest>(defaultForm());
  const [editForm, setEditForm] = useState<UpdateProviderRequest>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [modelForm, setModelForm] = useState<ModelItem>({ name: '', displayName: '', isFree: false });
  const [editModelForm, setEditModelForm] = useState<{ id: string; name: string; displayName: string; isFree: boolean; contextWindow?: number; maxTokens?: number }>({ id: '', name: '', displayName: '', isFree: false });
  const [editModelOpen, setEditModelOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [typeList, setTypeList] = useState<string[]>([]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newKeyForm, setNewKeyForm] = useState<{ providerId: string; keyValue: string; name: string; expiresAt: string; isActive: boolean }>({ providerId: '', keyValue: '', name: '', expiresAt: '', isActive: true });
  const [keyAction, setKeyAction] = useState<string | null>(null);
  const [createKeys, setCreateKeys] = useState<AddProviderKeyRequest[]>([]);
  const [createKeyForm, setCreateKeyForm] = useState<{ keyValue: string; name: string; isActive: boolean }>({ keyValue: '', name: '', isActive: true });

  useEffect(() => { load(); loadTypes(); }, []);

  const loadTypes = async () => {
    try { const { data: t } = await providerTypesApi.getAll(); setTypeList(t.map((x: ProviderType) => x.name)); }
    catch { setError('Failed to load types'); }
  };

  const load = async () => {
    try { const { data: d } = await providers.getAll(); setData(d); }
    catch { setError('Failed to load providers'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const payload: CreateProviderRequest = { ...form, models: form.models?.length ? form.models : undefined };
      if (createKeys.length) {
        payload.apiKeys = createKeys;
        delete payload.apiKey;
        delete payload.apiKeyExpiresAt;
      }
      await providers.create(payload);
      setOpen(false);
      setForm(defaultForm());
      setCreateKeys([]);
      setCreateKeyForm({ keyValue: '', name: '', isActive: true });
      await load();
    }
    catch { setError('Failed to create provider'); }
  };

  const addCreateKey = () => {
    if (!createKeyForm.keyValue.trim()) { setError('API key cannot be empty'); return; }
    const isActive = createKeyForm.isActive;
    const next: AddProviderKeyRequest[] = createKeys.map(k => isActive ? { ...k, isActive: false } : k);
    next.push({ keyValue: createKeyForm.keyValue.trim(), name: createKeyForm.name || undefined, isActive });
    setCreateKeys(next);
    setCreateKeyForm({ keyValue: '', name: '', isActive: !createKeys.some(k => k.isActive) });
  };

  const removeCreateKey = (idx: number) => {
    setCreateKeys(createKeys.filter((_, i) => i !== idx));
  };

  const toggleCreateKeyActive = (idx: number, val: boolean) => {
    setCreateKeys(createKeys.map((k, i) => i === idx ? { ...k, isActive: val } : { ...k, isActive: false }));
  };

  const handleDelete = async (id: string) => {
    try { await providers.delete(id); await load(); }
    catch { setError('Failed to delete provider'); }
  };

  const handleAddKey = async (p: Provider) => {
    if (!newKeyForm.keyValue.trim()) { setError('API key cannot be empty'); return; }
    setKeyAction('add');
    try {
      await providerKeysApi.add(p.id, {
        keyValue: newKeyForm.keyValue.trim(),
        name: newKeyForm.name || undefined,
        expiresAt: newKeyForm.expiresAt || null,
        isActive: newKeyForm.isActive,
      });
      setNewKeyForm({ providerId: '', keyValue: '', name: '', expiresAt: '', isActive: true });
      await load();
    }
    catch { setError('Failed to add API key'); }
    finally { setKeyAction(null); }
  };

  const handleSetDefaultKey = async (p: Provider, k: ProviderApiKey) => {
    setKeyAction(k.id);
    try {
      await providerKeysApi.setDefault(p.id, k.id);
      await load();
    }
    catch { setError('Failed to set default API key'); }
    finally { setKeyAction(null); }
  };

  const handleToggleKeyActive = async (p: Provider, k: ProviderApiKey, isActive: boolean) => {
    setKeyAction(k.id);
    try {
      await providerKeysApi.setActive(p.id, k.id, isActive);
      await load();
    }
    catch { setError(isActive ? 'Failed to activate API key' : 'Failed to deactivate API key'); }
    finally { setKeyAction(null); }
  };

  const handleDeleteKey = async (p: Provider, k: ProviderApiKey) => {
    if (!confirm('Delete this API key?')) return;
    setKeyAction(k.id);
    try {
      await providerKeysApi.remove(p.id, k.id);
      await load();
    }
    catch { setError('Failed to delete API key'); }
    finally { setKeyAction(null); }
  };

  const openEdit = (p: Provider) => {
    setEditProvider(p);
    setEditForm({
      name: p.name, baseUrl: p.baseUrl, apiKey: '', apiKeyExpiresAt: p.apiKeyExpiresAt ?? '',
      organization: '', rateLimit: p.rateLimit, timeout: undefined, isActive: p.isActive, priority: p.priority,
      chatEndpointPath: p.chatEndpointPath, type: p.type, removeModelIds: [],
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editProvider) return;
    try {
      const payload: Record<string, any> = {};
      const p = editProvider;
      if (editForm.name !== undefined && editForm.name !== p.name) payload.name = editForm.name;
      if (editForm.type !== undefined && editForm.type !== p.type) payload.type = editForm.type;
      if (editForm.baseUrl !== undefined && editForm.baseUrl !== p.baseUrl) payload.baseUrl = editForm.baseUrl;
      if (editForm.isActive !== undefined && editForm.isActive !== p.isActive) payload.isActive = editForm.isActive;
      if (editForm.priority !== undefined && editForm.priority !== p.priority) payload.priority = editForm.priority;
      if (editForm.rateLimit !== undefined && editForm.rateLimit !== p.rateLimit) payload.rateLimit = editForm.rateLimit;
      if (editForm.timeout !== undefined) payload.timeout = editForm.timeout;
      if (editForm.chatEndpointPath !== undefined && editForm.chatEndpointPath !== p.chatEndpointPath) payload.chatEndpointPath = editForm.chatEndpointPath;
      if (editForm.apiKeyExpiresAt !== undefined && editForm.apiKeyExpiresAt !== (p.apiKeyExpiresAt ?? '')) payload.apiKeyExpiresAt = editForm.apiKeyExpiresAt || null;
      if (editForm.apiKey) payload.apiKey = editForm.apiKey;
      if (editForm.organization) payload.organization = editForm.organization;
      if (editForm.models?.length) payload.models = editForm.models;
      if (editForm.removeModelIds?.length) payload.removeModelIds = editForm.removeModelIds;
      await providers.update(editProvider.id, payload);
      setEditOpen(false);
      setEditProvider(null);
      await load();
    }
    catch { setError('Failed to update provider'); }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    try { await providerTypesApi.create({ name: newTypeName }); setNewTypeName(''); await loadTypes(); }
    catch { setError('Failed to add type'); }
  };

  const handleDeleteType = async (id: string) => {
    try { await providerTypesApi.delete(id); await loadTypes(); }
    catch { setError('Failed to delete type'); }
  };

  const addModel = () => {
    if (!modelForm.name) return;
    if (editProvider) {
      setEditForm({ ...editForm, models: [...(editForm.models || []), { ...modelForm }] });
    } else {
      setForm({ ...form, models: [...(form.models || []), { ...modelForm }] });
    }
    setModelForm({ name: '', displayName: '', isFree: false });
  };

  const removeNewModel = (idx: number) => {
    if (editProvider) {
      setEditForm({ ...editForm, models: editForm.models?.filter((_, i) => i !== idx) });
    } else {
      setForm({ ...form, models: form.models?.filter((_, i) => i !== idx) });
    }
  };

  const removeExistingModel = async (modelId: string) => {
    if (!editProvider) return;
    try {
      await providers.update(editProvider.id, { removeModelIds: [modelId] });
      await load();
    }
    catch { setError('Failed to remove model'); }
  };

  const openEditModel = (m: AIModel) => {
    setEditModelForm({ id: m.id, name: m.name, displayName: m.displayName || '', isFree: m.isFree, contextWindow: m.contextWindow, maxTokens: m.maxTokens });
    setEditModelOpen(true);
  };

  const toggleActive = async (p: Provider) => {
    setTogglingId(p.id);
    try {
      await providers.update(p.id, { isActive: !p.isActive });
      await load();
    } catch { setError('Failed to toggle status'); }
    finally { setTogglingId(null); }
  };

  const handleEditModelSave = async () => {
    try {
      await models.update(editModelForm.id, {
        name: editModelForm.name,
        displayName: editModelForm.displayName || undefined,
        isFree: editModelForm.isFree,
        contextWindow: editModelForm.contextWindow,
        maxTokens: editModelForm.maxTokens,
      });
      setEditModelOpen(false);
      await load();
    }
    catch { setError('Failed to update model'); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const activeCount = data.filter(p => p.isActive).length;
  const inactiveCount = data.length - activeCount;
  const totalModels = data.reduce((s, p) => s + (p.models?.length ?? 0), 0);

  const filteredData = data.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.type.toLowerCase().includes(search.toLowerCase()) && !p.baseUrl.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && p.type !== filterType) return false;
    if (filterActive === 'active' && !p.isActive) return false;
    if (filterActive === 'inactive' && p.isActive) return false;
    return true;
  });

  const statCards = [
    { label: 'Total Providers', value: data.length, icon: <HubIcon />, color: '#1976d2' },
    { label: 'Active', value: activeCount, icon: <CheckCircleIcon />, color: '#2e7d32' },
    { label: 'Offline', value: inactiveCount, icon: <CancelIcon />, color: '#d32f2f' },
    { label: 'Total Models', value: totalModels, icon: <SmartToyIcon />, color: '#7b1fa2' },
    { label: 'Rate-Limited', value: data.filter(p => p.rateLimit && p.rateLimit > 0).length, icon: <SpeedIcon />, color: '#ed6c02' },
  ];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ mb: 3, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HubIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Providers</Typography>
              <Typography variant="caption" color="text.secondary">{data.length} providers &middot; {activeCount} online &middot; {totalModels} models connected</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setTypeOpen(true)}>Manage Types</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add Provider</Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={s.label}>
            <Paper elevation={0} sx={{
              p: 1.75, textAlign: 'center', height: '100%', borderRadius: 2.5,
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

      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.paper' }}>
        <TextField size="small" placeholder="Search name, type, URL..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, endAdornment: search ? <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton> : undefined } }}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <Select size="small" value={filterType} onChange={e => setFilterType(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          <MenuItem value="">All Types</MenuItem>
          {typeList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
        <Select size="small" value={filterActive} onChange={e => setFilterActive(e.target.value)} displayEmpty sx={{ minWidth: 130 }}>
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Showing <Box component="span" sx={{ fontWeight: 700 }}>{filteredData.length}</Box> of {data.length}
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', overflowX: 'auto', '& .MuiTable-root': { minWidth: 1080 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 44 }} />
              <TableCell>Provider</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Rate Limit</TableCell>
              <TableCell>API Key</TableCell>
              <TableCell>Models</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((p) => (
              <Fragment key={p.id}>
                <TableRow hover onClick={() => setExpandedRow(expandedRow === p.id ? null : p.id)} sx={{ cursor: 'pointer', opacity: p.isActive ? 1 : 0.6 }}>
                  <TableCell>{p.models?.length ? <IconButton size="small">{expandedRow === p.id ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}</IconButton> : null}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: alpha('#1976d2', 0.12), color: '#1976d2', fontSize: '0.95rem' }}>{typeIcon(p.type)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.62rem', display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.baseUrl}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Chip label={p.type} size="small" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} /></TableCell>
                  <TableCell>
                    <Chip icon={<PriorityHighIcon sx={{ fontSize: 13 }} />} label={p.priority} size="small" color={p.priority > 0 ? 'primary' : 'default'} variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                  </TableCell>
                  <TableCell>
                    {p.rateLimit && p.rateLimit > 0
                      ? <Chip icon={<SpeedIcon sx={{ fontSize: 13 }} />} label={`${p.rateLimit} RPM`} size="small" color="warning" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                      : <Chip icon={<SpeedIcon sx={{ fontSize: 13 }} />} label="∞" size="small" color="success" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />}
                  </TableCell>
                  <TableCell>
                    {p.apiKeys && p.apiKeys.length > 0 ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip icon={<KeyIcon sx={{ fontSize: 13 }} />} label={p.apiKeys.length} size="small" color="primary" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                        {p.apiKeys.some(k => k.isActive)
                          ? <Chip icon={<StarIcon sx={{ fontSize: 13 }} />} label="Active" size="small" color="success" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                          : <Chip label="No active" size="small" color="error" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />}
                        {p.apiKeys.some(k => k.expiresAt && new Date(k.expiresAt) < new Date())
                          ? <Chip label="Expired" size="small" color="error" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                          : null}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No key</Typography>
                    )}
                  </TableCell>
                  <TableCell><Chip icon={<SmartToyIcon sx={{ fontSize: 13 }} />} label={p.models?.length ?? 0} size="small" variant="outlined" sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.65rem' } }} /></TableCell>
                  <TableCell>
                    <Chip
                      icon={p.isActive ? <CheckCircleIcon sx={{ fontSize: 13 }} /> : <CancelIcon sx={{ fontSize: 13 }} />}
                      label={p.isActive ? 'Online' : 'Offline'}
                      size="small"
                      color={p.isActive ? 'success' : 'default'}
                      variant={p.isActive ? 'filled' : 'outlined'}
                      onClick={() => toggleActive(p)}
                      disabled={togglingId === p.id}
                      sx={{ height: 24, cursor: 'pointer', '& .MuiChip-label': { fontSize: '0.65rem', fontWeight: 700 } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(p); }} sx={{ bgcolor: alpha('#2e7d32', 0.08), '&:hover': { bgcolor: alpha('#2e7d32', 0.15) } }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this provider?')) handleDelete(p.id); }} sx={{ bgcolor: alpha('#d32f2f', 0.08), '&:hover': { bgcolor: alpha('#d32f2f', 0.15) } }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={9} sx={{ p: 0, borderBottom: 'none' }}>
                    <Collapse in={expandedRow === p.id} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: (t) => alpha(t.palette.background.default, 0.4) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>API Keys</Typography>
                          <Typography variant="caption" color="text.secondary">The active key is used for chat and test requests</Typography>
                        </Box>
                        {p.apiKeys?.length ? (
                          <Table size="small" sx={{ minWidth: 700, mb: 2 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Key</TableCell><TableCell>Name</TableCell><TableCell>Active</TableCell><TableCell>Expires</TableCell><TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {p.apiKeys.map(k => (
                                <TableRow key={k.id} sx={{ opacity: k.isActive ? 1 : 0.55 }}>
                                  <TableCell><Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{k.keyValue}</Box></TableCell>
                                  <TableCell>{k.name ?? '-'}</TableCell>
                                  <TableCell>
                                    <FormControlLabel control={<Switch size="small" checked={k.isActive} disabled={keyAction !== null} onChange={e => handleToggleKeyActive(p, k, e.target.checked)} />} label={k.isActive ? 'Active' : 'Inactive'} sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.72rem' } }} />
                                  </TableCell>
                                  <TableCell>
                                    {k.expiresAt
                                      ? <Typography variant="caption" color={new Date(k.expiresAt) < new Date() ? 'error' : 'text.secondary'}>{new Date(k.expiresAt).toLocaleDateString()}</Typography>
                                      : <Typography variant="caption" color="text.secondary">No expiry</Typography>}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                                      {!k.isActive && (
                                        <Tooltip title="Set as default">
                                          <IconButton size="small" color="primary" disabled={keyAction !== null} onClick={() => handleSetDefaultKey(p, k)}><CheckCircleIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                      )}
                                      <Tooltip title="Delete key">
                                        <IconButton size="small" color="error" disabled={keyAction !== null} onClick={() => handleDeleteKey(p, k)}><DeleteIcon fontSize="small" /></IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No API keys. Add one below to enable chat requests.</Typography>}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                          <TextField size="small" label="Key Value" placeholder="sk-..." value={newKeyForm.providerId === p.id ? newKeyForm.keyValue : ''} onChange={e => setNewKeyForm({ providerId: p.id, keyValue: e.target.value, name: newKeyForm.providerId === p.id ? newKeyForm.name : '', expiresAt: newKeyForm.providerId === p.id ? newKeyForm.expiresAt : '', isActive: newKeyForm.isActive })} sx={{ minWidth: 300 }} />
                          <TextField size="small" label="Name (optional)" value={newKeyForm.providerId === p.id ? newKeyForm.name : ''} onChange={e => setNewKeyForm({ providerId: p.id, name: e.target.value, keyValue: newKeyForm.providerId === p.id ? newKeyForm.keyValue : '', expiresAt: newKeyForm.providerId === p.id ? newKeyForm.expiresAt : '', isActive: newKeyForm.isActive })} sx={{ minWidth: 160 }} />
                          <TextField size="small" label="Expires" type="date" value={newKeyForm.providerId === p.id ? newKeyForm.expiresAt : ''} onChange={e => setNewKeyForm({ providerId: p.id, expiresAt: e.target.value, keyValue: newKeyForm.providerId === p.id ? newKeyForm.keyValue : '', name: newKeyForm.providerId === p.id ? newKeyForm.name : '', isActive: newKeyForm.isActive })} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 140 }} />
                          <FormControlLabel control={<Switch checked={newKeyForm.isActive} onChange={e => setNewKeyForm({ ...newKeyForm, isActive: e.target.checked })} />} label="Set as active" />
                          <Button size="small" variant="outlined" disabled={keyAction !== null || !(newKeyForm.providerId === p.id && newKeyForm.keyValue.trim())} onClick={() => handleAddKey(p)}>Add Key</Button>
                        </Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>Models</Typography>
                        {p.models?.length ? (
                          <Table size="small" sx={{ minWidth: 800 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell><TableCell>Display Name</TableCell><TableCell>Pricing</TableCell><TableCell>Context</TableCell><TableCell>Max Tokens</TableCell><TableCell>Streaming</TableCell><TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {p.models.map(m => (
                                <TableRow key={m.id}>
                                  <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                                  <TableCell>{m.displayName ?? '-'}</TableCell>
                                  <TableCell><Chip label={m.isFree ? 'Free' : 'Paid'} color={m.isFree ? 'success' : 'warning'} size="small" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem' } }} /></TableCell>
                                  <TableCell>{m.contextWindow ? m.contextWindow.toLocaleString() : '-'}</TableCell>
                                  <TableCell>{m.maxTokens ? m.maxTokens.toLocaleString() : '-'}</TableCell>
                                  <TableCell>{m.supportsStreaming ? <Chip label="Yes" color="success" size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { fontSize: '0.62rem' } }} /> : <Typography variant="caption" color="text.disabled">No</Typography>}</TableCell>
                                  <TableCell align="right"><IconButton size="small" onClick={() => openEditModel(m)}><EditIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : <Typography variant="body2" color="text.secondary">No models attached to this provider.</Typography>}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <HubIcon sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.4 }} />
                    <Typography color="text.secondary">
                      {data.length === 0 ? 'No providers yet. Add your first AI provider to get started.' : 'No providers match your filters.'}
                    </Typography>
                    {data.length === 0 && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}>Add Provider</Button>}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Provider Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Provider</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mt: 2 }} />
          <Select fullWidth value={form.type ?? 'CustomRESTAPI'} onChange={e => setForm({ ...form, type: e.target.value })} sx={{ mt: 2 }}>
            {typeList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
          <TextField fullWidth label="Base URL" value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} sx={{ mt: 2 }} helperText="e.g., https://api.openai.com/v1" />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>API Keys</Typography>
            {createKeys.length ? (
              <Box sx={{ mb: 1 }}>
                {createKeys.map((k, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                    <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', minWidth: 200, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.keyValue}</Box>
                    {k.name && <Typography variant="body2" color="text.secondary">({k.name})</Typography>}
                    <FormControlLabel control={<Switch size="small" checked={k.isActive} onChange={e => toggleCreateKeyActive(i, e.target.checked)} />} label="Active" />
                    <IconButton size="small" onClick={() => removeCreateKey(i)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            ) : <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No keys. Add one or use the single key field below.</Typography>}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField size="small" label="Key Value" placeholder="sk-..." value={createKeyForm.keyValue} onChange={e => setCreateKeyForm({ ...createKeyForm, keyValue: e.target.value })} sx={{ minWidth: 260 }} />
              <TextField size="small" label="Name (optional)" value={createKeyForm.name} onChange={e => setCreateKeyForm({ ...createKeyForm, name: e.target.value })} sx={{ minWidth: 140 }} />
              <FormControlLabel control={<Switch size="small" checked={createKeyForm.isActive} onChange={e => setCreateKeyForm({ ...createKeyForm, isActive: e.target.checked })} />} label="Set active" />
              <Button size="small" variant="outlined" onClick={addCreateKey}>Add</Button>
            </Box>
            <Typography variant="caption" color="text.secondary">Use the key list above, or the legacy single key field below if you only have one.</Typography>
          </Box>
          <TextField fullWidth label="Single API Key" type="password" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} sx={{ mt: 2 }} helperText="Only used when no keys were added above" />
          <TextField fullWidth label="API Key Expires" type="date" value={form.apiKeyExpiresAt ?? ''} onChange={e => setForm({ ...form, apiKeyExpiresAt: e.target.value || undefined })} slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 2 }} />
          <TextField fullWidth label="Organization" value={form.organization ?? ''} onChange={e => setForm({ ...form, organization: e.target.value })} sx={{ mt: 2 }} />
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Rate Limit (RPM)" type="number" value={form.rateLimit ?? ''} onChange={e => setForm({ ...form, rateLimit: e.target.value ? parseInt(e.target.value) : undefined })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Timeout (ms)" type="number" value={form.timeout ?? ''} onChange={e => setForm({ ...form, timeout: e.target.value ? parseInt(e.target.value) : undefined })} />
            </Grid>
          </Grid>
          <TextField fullWidth label="Chat Endpoint Path" value={form.chatEndpointPath ?? 'chat/completions'} onChange={e => setForm({ ...form, chatEndpointPath: e.target.value || undefined })} sx={{ mt: 2 }} helperText="e.g. chat/completions, v1/responses" />
          <FormControlLabel control={<Switch checked={form.isActive ?? true} onChange={e => setForm({ ...form, isActive: e.target.checked })} />} label="Active" sx={{ mt: 2 }} />
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>Models</Typography>
          {form.models?.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Chip label={m.isFree ? 'Free' : 'Paid'} color={m.isFree ? 'success' : 'warning'} size="small" />
              <Typography variant="body2">{m.name}</Typography>
              {m.displayName && <Typography variant="body2" color="text.secondary">({m.displayName})</Typography>}
              <IconButton size="small" onClick={() => removeNewModel(i)}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label="Model Name" value={modelForm.name} onChange={e => setModelForm({ ...modelForm, name: e.target.value })} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Display Name" value={modelForm.displayName} onChange={e => setModelForm({ ...modelForm, displayName: e.target.value })} sx={{ minWidth: 140 }} />
            <FormControlLabel control={<Switch checked={modelForm.isFree} onChange={e => setModelForm({ ...modelForm, isFree: e.target.checked })} />} label="Free" />
            <Button size="small" variant="outlined" onClick={addModel}>Add</Button>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => { setOpen(false); setForm(defaultForm()); setCreateKeys([]); setCreateKeyForm({ keyValue: '', name: '', isActive: true }); }}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save</Button></DialogActions>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Provider</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={editForm.name ?? ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} sx={{ mt: 2 }} />
          <Select fullWidth value={editForm.type ?? ''} onChange={e => setEditForm({ ...editForm, type: e.target.value })} sx={{ mt: 2 }} displayEmpty>
            <MenuItem value="" disabled>Select Type</MenuItem>
            {typeList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
          <TextField fullWidth label="Base URL" value={editForm.baseUrl ?? ''} onChange={e => setEditForm({ ...editForm, baseUrl: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="API Key" type="password" placeholder="Leave blank to keep existing" value={editForm.apiKey ?? ''} onChange={e => setEditForm({ ...editForm, apiKey: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="API Key Expires" type="date" value={editForm.apiKeyExpiresAt ?? ''} onChange={e => setEditForm({ ...editForm, apiKeyExpiresAt: e.target.value || undefined })} slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 2 }} />
          <TextField fullWidth label="Organization" value={editForm.organization ?? ''} onChange={e => setEditForm({ ...editForm, organization: e.target.value })} sx={{ mt: 2 }} />
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Rate Limit (RPM)" type="number" value={editForm.rateLimit ?? ''} onChange={e => setEditForm({ ...editForm, rateLimit: e.target.value ? parseInt(e.target.value) : undefined })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Timeout (ms)" type="number" value={editForm.timeout ?? ''} onChange={e => setEditForm({ ...editForm, timeout: e.target.value ? parseInt(e.target.value) : undefined })} />
            </Grid>
          </Grid>
          <TextField fullWidth label="Chat Endpoint Path" value={editForm.chatEndpointPath ?? ''} onChange={e => setEditForm({ ...editForm, chatEndpointPath: e.target.value || undefined })} sx={{ mt: 2 }} helperText="e.g. chat/completions, responses" />
          <FormControlLabel control={<Switch checked={editForm.isActive ?? true} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} />} label="Active" sx={{ mt: 2 }} />
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>Existing Models</Typography>
          {editProvider?.models?.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Chip label={m.isFree ? 'Free' : 'Paid'} color={m.isFree ? 'success' : 'warning'} size="small" />
              <Typography variant="body2">{m.name}</Typography>
              {m.displayName && <Typography variant="body2" color="text.secondary">({m.displayName})</Typography>}
              <IconButton size="small" onClick={() => removeExistingModel(m.id)}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          {(!editProvider?.models || editProvider.models.length === 0) && <Typography variant="body2" color="text.secondary">No models</Typography>}
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Add New Models</Typography>
          {editForm.models?.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <Chip label={m.isFree ? 'Free' : 'Paid'} color={m.isFree ? 'success' : 'warning'} size="small" />
              <Typography variant="body2">{m.name}</Typography>
              {m.displayName && <Typography variant="body2" color="text.secondary">({m.displayName})</Typography>}
              <IconButton size="small" onClick={() => removeNewModel(i)}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label="Model Name" value={modelForm.name} onChange={e => setModelForm({ ...modelForm, name: e.target.value })} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Display Name" value={modelForm.displayName} onChange={e => setModelForm({ ...modelForm, displayName: e.target.value })} sx={{ minWidth: 140 }} />
            <FormControlLabel control={<Switch checked={modelForm.isFree} onChange={e => setModelForm({ ...modelForm, isFree: e.target.checked })} />} label="Free" />
            <Button size="small" variant="outlined" onClick={addModel}>Add</Button>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => { setEditOpen(false); setEditProvider(null); }}>Cancel</Button><Button variant="contained" onClick={handleEditSave}>Save</Button></DialogActions>
      </Dialog>

      {/* Manage Types Dialog */}
      <Dialog open={typeOpen} onClose={() => setTypeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Provider Types</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField size="small" fullWidth label="New Type Name" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} />
            <Button variant="contained" onClick={handleAddType}>Add</Button>
          </Box>
          <Box sx={{ mt: 2 }}>
            {typeList.map(t => (
              <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label={t} size="small" />
                <IconButton size="small" color="error" onClick={() => { const found = data.find(p => p.type === t); if (found) { setError('Cannot delete type in use'); return; } providerTypesApi.getAll().then(r => { const pt = r.data.find((x: ProviderType) => x.name === t); if (pt) handleDeleteType(pt.id); }); }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setTypeOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={editModelOpen} onClose={() => setEditModelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Model</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Model Name" value={editModelForm.name} onChange={e => setEditModelForm({ ...editModelForm, name: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Display Name" value={editModelForm.displayName} onChange={e => setEditModelForm({ ...editModelForm, displayName: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Context Window" type="number" value={editModelForm.contextWindow ?? ''} onChange={e => setEditModelForm({ ...editModelForm, contextWindow: e.target.value ? parseInt(e.target.value) : undefined })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Max Tokens" type="number" value={editModelForm.maxTokens ?? ''} onChange={e => setEditModelForm({ ...editModelForm, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })} sx={{ mt: 2 }} />
          <FormControlLabel control={<Switch checked={editModelForm.isFree} onChange={e => setEditModelForm({ ...editModelForm, isFree: e.target.checked })} />} label="Free Model" sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setEditModelOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleEditModelSave}>Save</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
