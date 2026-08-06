import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import { endpointDocs, type EndpointDoc } from '../api/endpointDocs';
import { models } from '../api/endpoints';
import type { AIModel } from '../types';

const methodColors: Record<string, string> = {
  GET: '#1976d2', POST: '#388e3c', PUT: '#f57c00', DELETE: '#d32f2f',
};

const groupIcons: Record<string, string> = {
  Authentication: '🔐', Providers: '🏗️', Models: '🤖', 'API Keys': '🔑',
  Usage: '📊', Analytics: '📈', Billing: '💳', 'Prompt Templates': '📝',
  'Chat / Gateway': '💬', Admin: '👑', Settings: '⚙️', Logs: '📋',
};

export const DocsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeModels, setActiveModels] = useState<AIModel[]>([]);

  useEffect(() => {
    models.getAll().then(r => setActiveModels(r.data.filter(m => m.status === 'Active'))).catch(() => {});
  }, []);

  const groups = endpointDocs.reduce<Record<string, EndpointDoc[]>>((acc, doc) => {
    (acc[doc.group] = acc[doc.group] || []).push(doc);
    return acc;
  }, {});

  const filtered = Object.entries(groups).map(([group, endpoints]) => ({
    group,
    endpoints: endpoints.filter(e =>
      !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.path.toLowerCase().includes(search.toLowerCase()) ||
      e.method.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.endpoints.length > 0);

  const totalEndpoints = endpointDocs.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>API Documentation</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalEndpoints} endpoints &middot; {activeModels.length} active models
          </Typography>
        </Box>
        <TextField
          size="small" placeholder="Search endpoints..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      {filtered.map(({ group, endpoints }) => (
        <Box key={group} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{groupIcons[group] || '📡'}</span> {group}
            <Chip label={`${endpoints.length} ${endpoints.length === 1 ? 'endpoint' : 'endpoints'}`} size="small" sx={{ ml: 1 }} />
          </Typography>
          <Grid container spacing={2}>
            {endpoints.map((doc) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
                <Card
                  sx={{
                    cursor: 'pointer', transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    borderLeft: 3, borderColor: methodColors[doc.method] || '#999',
                  }}
                  onClick={() => navigate(`/docs/${doc.id}`)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip label={doc.method} size="small"
                        sx={{ fontWeight: 700, minWidth: 52, color: '#fff', bgcolor: methodColors[doc.method] || '#999' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.path}
                      </Typography>
                      {doc.auth === 'None' ? <PublicIcon fontSize="inherit" color="success" /> : <LockIcon fontSize="inherit" color="action" />}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{doc.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {doc.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">No endpoints match your search</Typography>
        </Box>
      )}
    </Box>
  );
};
