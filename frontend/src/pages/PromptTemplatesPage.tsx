import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, IconButton, Alert,
  Select, MenuItem, Stack, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { promptTemplates } from '../api/endpoints';
import { PromptTemplate, CreatePromptTemplateRequest } from '../types';

export const PromptTemplatesPage = () => {
  const [data, setData] = useState<PromptTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [form, setForm] = useState<CreatePromptTemplateRequest>({ name: '', content: '', category: '', tags: '', isPublic: false });

  useEffect(() => { promptTemplates.getAll().then(r => setData(r.data)).catch(() => setError('Failed to load')); }, []);

  const categories = [...new Set(data.map(t => t.category).filter(Boolean))];

  const filteredData = data.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.tags?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterVisibility === 'public' && !t.isPublic) return false;
    if (filterVisibility === 'private' && t.isPublic) return false;
    return true;
  });

  const handleSave = async () => {
    try { await promptTemplates.create(form); setOpen(false); const r = await promptTemplates.getAll(); setData(r.data); }
    catch { setError('Failed to create'); }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>Prompt Templates</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 220 }} />
        <Select size="small" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} displayEmpty sx={{ minWidth: 140 }}>
          <MenuItem value="">All Categories</MenuItem>
          {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
        <Select size="small" value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="public">Public</MenuItem>
          <MenuItem value="private">Private</MenuItem>
        </Select>
        <Typography variant="body2" color="text.secondary">{filteredData.length} of {data.length}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New Template</Button>
      </Stack>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Name</TableCell><TableCell>Category</TableCell><TableCell>Tags</TableCell><TableCell>Public</TableCell><TableCell>Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.category ?? '-'}</TableCell>
                <TableCell>{t.tags ?? '-'}</TableCell>
                <TableCell>{t.isPublic ? <Chip label="Public" size="small" color="primary" /> : <Chip label="Private" size="small" />}</TableCell>
                <TableCell><IconButton size="small" onClick={() => navigator.clipboard.writeText(t.content)}><ContentCopyIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Prompt Template</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Content" multiline rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
