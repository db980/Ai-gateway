import DashboardIcon from '@mui/icons-material/Dashboard';
import HubIcon from '@mui/icons-material/Hub';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyIcon from '@mui/icons-material/Key';
import BarChartIcon from '@mui/icons-material/BarChart';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PaymentIcon from '@mui/icons-material/Payment';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import ArticleIcon from '@mui/icons-material/Article';
import ApiIcon from '@mui/icons-material/Api';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalculateIcon from '@mui/icons-material/Calculate';

export interface NavItem { text: string; icon: React.ReactNode; path: string; roles: string[]; }
export interface NavSection { title?: string; items: NavItem[]; }

export const sections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'Usage', icon: <BarChartIcon />, path: '/usage', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'Request Details', icon: <ListAltIcon />, path: '/request-details', roles: ['SuperAdmin', 'Admin', 'User'] },
    ],
  },
  {
    title: 'AI Platform',
    items: [
      { text: 'Providers', icon: <HubIcon />, path: '/providers', roles: ['SuperAdmin', 'Admin'] },
      { text: 'Models', icon: <SmartToyIcon />, path: '/models', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'Model Pricing', icon: <CalculateIcon />, path: '/models/pricing', roles: ['SuperAdmin', 'Admin'] },
      { text: 'Playground', icon: <PlayArrowIcon />, path: '/playground', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'Prompt Templates', icon: <DescriptionIcon />, path: '/prompts', roles: ['SuperAdmin', 'Admin', 'User'] },
    ],
  },
  {
    title: 'Account',
    items: [
      { text: 'API Keys', icon: <KeyIcon />, path: '/api-keys', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'Billing', icon: <PaymentIcon />, path: '/billing', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'API Docs', icon: <ApiIcon />, path: '/endpoint-docs', roles: ['SuperAdmin', 'Admin', 'User'] },
      { text: 'Cost Calculator', icon: <CalculateIcon />, path: '/tools/cost-calculator', roles: ['SuperAdmin', 'Admin', 'User'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', roles: ['SuperAdmin', 'Admin'] },
      { text: 'Users', icon: <PeopleIcon />, path: '/users', roles: ['SuperAdmin', 'Admin'] },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: ['SuperAdmin', 'Admin'] },
      { text: 'Logs', icon: <ArticleIcon />, path: '/logs', roles: ['SuperAdmin', 'Admin'] },
    ],
  },
];

export const roleColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  SuperAdmin: 'error',
  Admin: 'primary',
  User: 'success',
};

export const filterSections = (role?: string): NavSection[] =>
  sections
    .map(sec => ({ ...sec, items: sec.items.filter(item => role && item.roles.includes(role)) }))
    .filter(sec => sec.items.length > 0);
