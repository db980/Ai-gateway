import { createTheme, type Components } from '@mui/material/styles';

const shape = { borderRadius: 12 };

const sharedComponents = (mode: 'light' | 'dark'): Components => ({
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        border: '1px solid',
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 600, borderRadius: 10, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.15)' } },
      sizeSmall: { fontSize: '0.78rem' },
    },
  },
  MuiTextField: {
    defaultProps: { variant: 'outlined' },
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: { root: { borderRadius: 10 } },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600 },
    },
  },
  MuiDialog: {
    styleOverrides: { paper: { borderRadius: 16 } },
  },
  MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700 } } },
  MuiTableCell: {
    styleOverrides: {
      head: { fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.5, textTransform: 'uppercase' },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: { '& .MuiTableCell-head': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' } },
    },
  },
  MuiTooltip: {
    styleOverrides: { tooltip: { borderRadius: 8, fontSize: '0.72rem' } },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: { borderRadius: 10, margin: '2px 8px', '&.Mui-selected': { backgroundColor: mode === 'dark' ? 'rgba(144,202,249,0.16)' : 'rgba(25,118,210,0.12)' } },
    },
  },
  MuiSwitch: { styleOverrides: { root: {} } },
  MuiSlider: {
    styleOverrides: { thumb: { boxShadow: 'none' } },
  },
  MuiCard: {
    styleOverrides: { root: { borderRadius: 16 } },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: { border: 'none', borderRight: '1px solid', borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        backgroundColor: mode === 'dark' ? '#121212' : '#ffffff',
      },
    },
  },
  MuiAvatar: {
    styleOverrides: { root: { fontWeight: 700 } },
  },
  MuiSelect: {
    styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } } },
  },
});

const baseTypography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.2 },
  h5: { fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.2 },
  h6: { fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600 },
  body1: { fontSize: '0.925rem', lineHeight: 1.55 },
  body2: { fontSize: '0.875rem', lineHeight: 1.55 },
  caption: { fontSize: '0.75rem' },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#7b1fa2' },
    background: { default: '#f4f6fb', paper: '#ffffff' },
    success: { main: '#2e7d32' },
    error: { main: '#d32f2f' },
    warning: { main: '#ed6c02' },
    info: { main: '#0288d1' },
    text: { primary: '#1a2233', secondary: '#5b6472' },
    divider: 'rgba(0,0,0,0.08)',
  },
  shape,
  typography: baseTypography,
  components: sharedComponents('light'),
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#0b0d12', paper: '#151922' },
    success: { main: '#66bb6a' },
    error: { main: '#f44336' },
    warning: { main: '#ffa726' },
    info: { main: '#29b6f6' },
    text: { primary: '#e8edf5', secondary: '#93a0b4' },
    divider: 'rgba(255,255,255,0.08)',
  },
  shape,
  typography: baseTypography,
  components: sharedComponents('dark'),
});
