import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Avatar, Menu, MenuItem, Divider, Chip, alpha, Tooltip, Paper, Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import BoltIcon from '@mui/icons-material/Bolt';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import { useAuthStore } from '../store/authStore';
import { useThemeContext } from '../context/ThemeContext';
import { sections, roleColors, filterSections } from './navigation';
import { CommandPalette } from '../components/CommandPalette';

const drawerWidth = 264;

export const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeContext();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredSections = filterSections(user?.role);

  const pageTitle = sections.flatMap(s => s.items).find(i => i.path === location.pathname)?.text ?? 'AI Gateway';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
          boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.35)}`,
        }}>
          <BoltIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>AI Gateway</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.62rem' }}>Unified AI Router</Typography>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto', py: 1, '&::-webkit-scrollbar': { width: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 } }}>
        {filteredSections.map((sec) => (
          <Box key={sec.title} sx={{ mb: 0.5 }}>
            {sec.title && (
              <Typography variant="caption" sx={{
                px: 2.5, py: 1, display: 'block', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                color: 'text.secondary', fontSize: '0.62rem',
              }}>
                {sec.title}
              </Typography>
            )}
            <List disablePadding>
              {sec.items.map((item) => {
                const selected = location.pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                    <ListItemButton
                      selected={selected}
                      onClick={() => { navigate(item.path); setMobileOpen(false); }}
                      sx={{
                        pl: 2.5,
                        '& .MuiListItemIcon-root': { minWidth: 36, color: selected ? 'primary.main' : 'inherit' },
                        '& .MuiListItemText-primary': { fontSize: '0.86rem', fontWeight: selected ? 700 : 500 },
                      }}
                    >
                      <ListItemIcon sx={{ fontSize: 20 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                      {selected && <ChevronRightIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
      {user && (
        <Box sx={{ p: 1.5 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, transparent)`,
            }}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: '0.95rem' }}>{user.username?.[0]?.toUpperCase()}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" noWrap sx={{ fontWeight: 700, display: 'block' }}>{user.username}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.62rem', display: 'block' }}>{user.email}</Typography>
            </Box>
            <Tooltip title="Logout">
              <IconButton size="small" color="error" onClick={() => { logout(); navigate('/login'); }}>
                <LogoutIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" color="inherit" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 800, fontSize: '1.05rem' }}>{pageTitle}</Typography>
          <Tooltip title="Search (Ctrl+K)">
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
              onClick={() => setPaletteOpen(true)}
              sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary', borderColor: 'divider', fontWeight: 500, textTransform: 'none', py: 0.5 }}
            >
              Search
              <Box component="span" sx={{ ml: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 0.5, fontSize: '0.6rem', py: 0.25, color: 'text.disabled' }}>Ctrl K</Box>
            </Button>
          </Tooltip>
          <Chip label={user?.role ?? ''} size="small" color={roleColors[user?.role ?? 'User']} variant="outlined" sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' }, height: 24, '& .MuiChip-label': { fontSize: '0.68rem', fontWeight: 700 } }} />
          <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
            <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 0.5 }}>
              {isDark ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
          <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.85rem' }}>{user?.username?.[0]?.toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.username}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/dashboard'); }}>Profile</MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}>
              <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, bgcolor: 'background.default' }}>
        <Toolbar sx={{ minHeight: 56 }} />
        <Outlet />
      </Box>
      <CommandPalette
        open={paletteOpen}
        role={user?.role}
        currentPath={location.pathname}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(path) => navigate(path)}
      />
    </Box>
  );
};
