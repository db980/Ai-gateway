import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, CircularProgress,
} from '@mui/material';
import { settings } from '../api/endpoints';
import { Setting } from '../types';

export const SettingsPage = () => {
  const [data, setData] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const r = await settings.getAll(); setData(r.data); } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleSave = async (key: string) => {
    try { await settings.update(key, editing[key]); await load(); }
    catch { /* ignore */ }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>Settings</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Key</TableCell><TableCell>Value</TableCell><TableCell>Description</TableCell><TableCell>Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.key}>
                <TableCell>{s.key}</TableCell>
                <TableCell>
                  <TextField size="small" value={editing[s.key] ?? s.value} onChange={e => setEditing({ ...editing, [s.key]: e.target.value })} />
                </TableCell>
                <TableCell>{s.description ?? '-'}</TableCell>
                <TableCell><Button size="small" variant="contained" onClick={() => handleSave(s.key)}>Save</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
