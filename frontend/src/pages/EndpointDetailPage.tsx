import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Grid, Card, CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CodeIcon from '@mui/icons-material/Code';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import { endpointDocs } from '../api/endpointDocs';
import { models } from '../api/endpoints';
import type { AIModel } from '../types';

const methodColors: Record<string, string> = {
  GET: '#1976d2', POST: '#388e3c', PUT: '#f57c00', DELETE: '#d32f2f',
};

export const EndpointDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doc = endpointDocs.find(d => d.id === id);
  const [modelList, setModelList] = useState<AIModel[]>([]);

  useEffect(() => {
    models.getAll().then(r => setModelList(r.data)).catch(() => {});
  }, []);

  const isChatEndpoint = doc?.id === 'gateway-chat';
  const activeModels = modelList.filter(m => m.status === 'Active');
  const freeModels = modelList.filter(m => m.isFree);
  const paidModels = modelList.filter(m => !m.isFree);

  if (!doc) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="text.secondary">Endpoint not found</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/docs')} sx={{ mt: 2 }}>
          Back to Documentation
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/docs')} sx={{ mb: 2 }}>
        Back to Documentation
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={doc.method} size="medium"
            sx={{ fontWeight: 700, minWidth: 64, color: '#fff', bgcolor: methodColors[doc.method] || '#999', fontSize: '0.9rem' }} />
          <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{doc.path}</Typography>
          <Chip icon={doc.auth === 'None' ? <PublicIcon /> : <LockIcon />}
            label={doc.auth} size="small" variant="outlined" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{doc.title}</Typography>
        <Typography variant="body1" color="text.secondary">{doc.description}</Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {doc.queryParams && doc.queryParams.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Query Parameters</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Required</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {doc.queryParams.map(p => (
                      <TableRow key={p.name}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{p.name}</TableCell>
                        <TableCell>{p.type}</TableCell>
                        <TableCell>
                          <Chip label={p.required ? 'Required' : 'Optional'} size="small"
                            color={p.required ? 'error' : 'default'} variant="outlined" />
                        </TableCell>
                        <TableCell>{p.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {doc.requestBody && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CodeIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Request Body</Typography>
              </Box>
              <Box component="pre" sx={{
                p: 2, borderRadius: 1, bgcolor: 'grey.900', color: 'grey.100',
                fontFamily: 'Consolas, "Courier New", monospace', fontSize: '0.8rem',
                overflow: 'auto', maxHeight: 300,
              }}>
                {doc.requestBody}
              </Box>
            </Paper>
          )}

          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CodeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Response Body</Typography>
            </Box>
            <Box component="pre" sx={{
              p: 2, borderRadius: 1, bgcolor: 'grey.900', color: 'grey.100',
              fontFamily: 'Consolas, "Courier New", monospace', fontSize: '0.8rem',
              overflow: 'auto', maxHeight: 400,
            }}>
              {doc.responseBody}
            </Box>
          </Paper>

          {doc.exampleRequest && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CodeIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Example Request</Typography>
              </Box>
              <Box component="pre" sx={{
                p: 2, borderRadius: 1, bgcolor: 'grey.900', color: '#e8f5e9',
                fontFamily: 'Consolas, "Courier New", monospace', fontSize: '0.8rem',
                overflow: 'auto',
              }}>
                {doc.exampleRequest}
              </Box>
            </Paper>
          )}

          {doc.exampleResponse && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CodeIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Example Response</Typography>
              </Box>
              <Box component="pre" sx={{
                p: 2, borderRadius: 1, bgcolor: 'grey.900', color: '#e3f2fd',
                fontFamily: 'Consolas, "Courier New", monospace', fontSize: '0.8rem',
                overflow: 'auto',
              }}>
                {doc.exampleResponse}
              </Box>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Endpoint Info</Typography>
              <Box sx={{ '& > div': { mb: 1.5 } }}>
                <Box><Typography variant="caption" color="text.secondary">Method</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{doc.method}</Typography></Box>
                <Divider />
                <Box><Typography variant="caption" color="text.secondary">Path</Typography><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{doc.path}</Typography></Box>
                <Divider />
                <Box><Typography variant="caption" color="text.secondary">Auth</Typography><Typography variant="body2">{doc.auth}</Typography></Box>
                <Divider />
                <Box><Typography variant="caption" color="text.secondary">Access</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {doc.roles.map(r => <Chip key={r} label={r === '*' ? 'All Roles' : r} size="small" variant="outlined" />)}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Active Models ({activeModels.length})</Typography>
              {isChatEndpoint ? (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>Free ({freeModels.length})</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {freeModels.slice(0, 8).map(m => <Chip key={m.id} label={m.name} size="small" color="success" variant="outlined" />)}
                      {freeModels.length > 8 && <Typography variant="caption" color="text.secondary">+{freeModels.length - 8} more</Typography>}
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box>
                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>Paid ({paidModels.length})</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {paidModels.slice(0, 8).map(m => <Chip key={m.id} label={m.name} size="small" color="warning" variant="outlined" />)}
                      {paidModels.length > 8 && <Typography variant="caption" color="text.secondary">+{paidModels.length - 8} more</Typography>}
                    </Box>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Not applicable for this endpoint</Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Related</Typography>
              {doc.relatedEndpoint ? (
                <Button variant="text" size="small" onClick={() => navigate(`/playground`)}>
                  Try in Playground
                </Button>
              ) : (
                <Button variant="text" size="small" onClick={() => navigate('/docs')}>
                  View All Endpoints
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
