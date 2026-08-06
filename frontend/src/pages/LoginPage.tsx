import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Tab, Tabs, Alert, CircularProgress } from '@mui/material';
import { auth } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';

export const LoginPage = () => {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  if (isAuthenticated) { navigate('/dashboard'); return null; }

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const { data } = tab === 0
        ? await auth.login({ email, password })
        : await auth.register({ email, username, password });
      setAuth(data.user, data.token, data.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ maxWidth: 450, width: '100%', mx: 2 }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>AI Gateway</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label="Login" /><Tab label="Register" />
          </Tabs>
          <Box sx={{ mt: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
            {tab === 1 && <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 2 }} />}
            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} />
            <Button fullWidth variant="contained" size="large" onClick={handleSubmit} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : tab === 0 ? 'Login' : 'Register'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
