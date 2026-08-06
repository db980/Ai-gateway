import { Component, type ReactNode } from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 720, mx: 'auto', mt: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>Something went wrong while rendering this page.</Alert>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              {this.state.error.message || String(this.state.error)}
            </Typography>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.72rem', color: 'text.secondary', mt: 1, maxHeight: 240, overflow: 'auto' }}>
              {this.state.error.stack}
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard'; }}>
              Reload dashboard
            </Button>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}
