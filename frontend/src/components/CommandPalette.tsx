import { useEffect, useMemo, useState } from 'react';
import { Box, Dialog, DialogTitle, List, ListItemButton, ListItemIcon, ListItemText, TextField, Typography, InputAdornment, Divider } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { filterSections, type NavSection } from '../layouts/navigation';

interface Props {
  open: boolean;
  role?: string;
  currentPath: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const CommandPalette = ({ open, role, currentPath, onClose, onNavigate }: Props) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const results = useMemo<NavSection[]>(() => {
    const q = query.trim().toLowerCase();
    return filterSections(role)
      .map(sec => ({ ...sec, items: sec.items.filter(i => !q || i.text.toLowerCase().includes(q) || i.path.toLowerCase().includes(q)) }))
      .filter(sec => sec.items.length > 0);
  }, [query, role]);

  const flatItems = results.flatMap(s => s.items);

  const handlePick = (path: string) => {
    onClose();
    if (path !== currentPath) onNavigate(path);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ p: 0 }}>
        <TextField
          autoFocus fullWidth
          placeholder="Search pages... (type and press Enter)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && flatItems.length > 0) handlePick(flatItems[0].path); if (e.key === 'Escape') onClose(); }}
          variant="standard"
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, disableUnderline: true } }}
          sx={{ px: 2, py: 1.5 }}
        />
        <Divider />
      </DialogTitle>
      <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
        {flatItems.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No pages match &ldquo;{query}&rdquo;</Typography>
        )}
        {results.map(sec => (
          <Box key={sec.title}>
            <Typography variant="caption" sx={{ px: 2, pt: 1.5, display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontSize: '0.6rem' }}>
              {sec.title}
            </Typography>
            <List dense disablePadding>
              {sec.items.map(item => (
                <ListItemButton key={item.path} onClick={() => handlePick(item.path)} selected={item.path === currentPath} sx={{ mx: 1, borderRadius: 2 }}>
                  <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} slotProps={{ primary: { sx: { fontSize: '0.9rem', fontWeight: 500 } } }} />
                  <ArrowRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
        <Box sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>Use ↑↓ to navigate · Enter to open · Esc to close</Typography>
        </Box>
      </Box>
    </Dialog>
  );
};
