import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, TextField, Select, MenuItem, Stack, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { admin } from '../api/endpoints';
import { AdminUser } from '../types';

export const UsersPage = () => {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');

  useEffect(() => { admin.users().then(r => setData(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <CircularProgress />;

  const filteredData = data.filter(u => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (filterActive === 'active' && !u.isActive) return false;
    if (filterActive === 'inactive' && u.isActive) return false;
    return true;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>Users</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 240 }} />
        <Select size="small" value={filterRole} onChange={e => setFilterRole(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          <MenuItem value="">All Roles</MenuItem>
          <MenuItem value="User">User</MenuItem>
          <MenuItem value="Admin">Admin</MenuItem>
          <MenuItem value="SuperAdmin">SuperAdmin</MenuItem>
        </Select>
        <Select size="small" value={filterActive} onChange={e => setFilterActive(e.target.value)} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
        <Typography variant="body2" color="text.secondary">{filteredData.length} of {data.length}</Typography>
      </Stack>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Email</TableCell><TableCell>Username</TableCell><TableCell>Role</TableCell><TableCell>Plan</TableCell><TableCell>Status</TableCell><TableCell>Credits</TableCell><TableCell>Created</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell><Chip label={u.role} size="small" color={u.role === 'SuperAdmin' ? 'error' : u.role === 'Admin' ? 'warning' : 'default'} /></TableCell>
                <TableCell>{u.plan}</TableCell>
                <TableCell><Chip label={u.isActive ? 'Active' : 'Inactive'} color={u.isActive ? 'success' : 'default'} size="small" /></TableCell>
                <TableCell>{u.credits.toFixed(2)}</TableCell>
                <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
