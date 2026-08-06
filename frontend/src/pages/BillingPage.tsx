import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, alpha } from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PaymentsIcon from '@mui/icons-material/Payments';
import CancelIcon from '@mui/icons-material/Cancel';
import BoltIcon from '@mui/icons-material/Bolt';
import { billing, auth } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { Invoice, Plan, BillingSummary } from '../types';

const PLAN_COLORS: Record<string, string> = { Free: '#9e9e9e', Starter: '#1976d2', Professional: '#7b1fa2', Enterprise: '#c62828' };

const refreshProfile = async () => {
  try {
    const { data } = await auth.profile();
    useAuthStore.getState().setUser(data);
  } catch { /* ignore */ }
};

export const BillingPage = () => {
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      billing.plans().then(r => setPlans(r.data)).catch(() => {}),
      billing.summary().then(r => setSummary(r.data)).catch(() => {}),
      billing.invoices().then(r => setInvoices(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const currentPlan = summary?.currentPlan ?? user?.plan ?? 'Free';

  const openCheckout = (plan: Plan) => {
    setCheckoutPlan(plan);
    setCheckoutMsg(null);
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCvc('');
  };

  const submitCheckout = async () => {
    if (!checkoutPlan) return;
    setProcessing(true);
    setCheckoutMsg(null);
    const digits = cardNumber.replace(/\D/g, '');
    const cardToken = digits.startsWith('4000') ? 'tok_decline' : 'tok_visa';
    try {
      const { data } = await billing.checkout({ plan: checkoutPlan.name, cardToken, cardHolder: cardHolder || undefined });
      if (data.success) {
        setCheckoutMsg({ type: 'success', text: `Payment approved (${data.transactionId}). You are now on ${data.newPlan} with ${data.invoice?.invoiceNumber}.` });
        setCheckoutPlan(null);
        load();
        refreshProfile();
      } else {
        setCheckoutMsg({ type: 'error', text: data.errorMessage || 'Payment failed. Please try again.' });
      }
    } catch (e: any) {
      setCheckoutMsg({ type: 'error', text: e?.response?.data?.message || 'Payment failed. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const submitCancel = async () => {
    setProcessing(true);
    setCancelMsg(null);
    try {
      const { data } = await billing.cancel();
      setCancelMsg(data.message);
      setCancelDialogOpen(false);
      load();
      refreshProfile();
    } catch (e: any) {
      setCancelMsg(e?.response?.data?.message || 'Failed to cancel subscription.');
      setCancelDialogOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Billing</Typography>
          <Typography variant="body2" color="text.secondary">Manage your subscription, payment gateway and invoices.</Typography>
        </Box>
        {currentPlan !== 'Free' && (
          <Button startIcon={<CancelIcon />} color="error" variant="outlined" onClick={() => { setCancelMsg(null); setCancelDialogOpen(true); }}>
            Cancel subscription
          </Button>
        )}
      </Box>

      {cancelMsg && <Alert severity="success" sx={{ mb: 2 }}>{cancelMsg}</Alert>}

      <Paper sx={{ mb: 3, p: 2.5, background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.08)}, ${alpha(t.palette.secondary.dark, 0.05)})`, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <WorkspacePremiumIcon sx={{ color: (t) => t.palette.primary.main, fontSize: 34 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Current Plan</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{currentPlan}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Credits</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{(summary?.credits ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Gateway</Typography>
            <Chip icon={<PaymentsIcon />} label={summary?.gateway ?? '—'} size="small" variant="outlined" sx={{ mt: 0.5 }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Total Spent</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>${(summary?.totalSpent ?? 0).toFixed(2)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Next Billing</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{summary?.nextBillingDate ? new Date(summary.nextBillingDate).toLocaleDateString() : '—'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {currentPlan === 'Free' && plans.length > 0 && (
              <Button variant="contained" startIcon={<BoltIcon />} onClick={() => openCheckout(plans.find(p => p.isPaid) ?? plans[0])}>Upgrade now</Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>Choose a plan</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.name;
          const isDowngrade = !plan.isPaid && currentPlan !== 'Free';
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan.name}>
              <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: isCurrent ? 'primary.main' : 'divider', boxShadow: isCurrent ? (t) => `0 0 0 2px ${alpha(t.palette.primary.main, 0.25)}` : 'none', position: 'relative' }}>
                {isCurrent && <Chip label="Current" color="primary" size="small" sx={{ position: 'absolute', top: 8, right: 8 }} />}
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, my: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: (t) => plan.isPaid ? t.palette.primary.main : 'text.primary' }}>
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{plan.price === 0 ? 'forever' : plan.billingCycle}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{plan.tokensIncluded.toLocaleString()} tokens / cycle</Typography>
                <Box sx={{ flex: 1 }}>
                  {plan.features.map(f => (
                    <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="body2">{f}</Typography>
                    </Box>
                  ))}
                </Box>
                <Button
                  variant={isCurrent ? 'outlined' : 'contained'}
                  disabled={isCurrent}
                  onClick={() => openCheckout(plan)}
                  sx={{ mt: 2 }}
                >
                  {isCurrent ? 'Current Plan' : isDowngrade ? 'Downgrade to Free' : plan.price === 0 ? 'Choose Free' : `Upgrade to ${plan.name}`}
                </Button>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>Invoices</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Gateway Ref</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>No invoices yet</TableCell></TableRow>
            )}
            {invoices.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{inv.invoiceNumber}</TableCell>
                <TableCell><Chip label={inv.plan} size="small" sx={{ bgcolor: alpha(PLAN_COLORS[inv.plan] ?? '#1976d2', 0.12), color: PLAN_COLORS[inv.plan] ?? '#1976d2' }} /></TableCell>
                <TableCell>{inv.currency} ${inv.amount.toFixed(2)}</TableCell>
                <TableCell><Chip label={inv.status} color={inv.status === 'Paid' ? 'success' : 'warning'} size="small" /></TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inv.gatewayRef ? `${inv.gatewayRef.slice(0, 16)}…` : '—'}</TableCell>
                <TableCell>{new Date(inv.paidAt ?? inv.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!checkoutPlan} onClose={() => !processing && setCheckoutPlan(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCardIcon /> {checkoutPlan ? `Upgrade to ${checkoutPlan.name}` : ''}
        </DialogTitle>
        <DialogContent>
          {checkoutPlan && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: (t) => alpha(t.palette.primary.main, 0.06) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">{checkoutPlan.name} plan · {checkoutPlan.tokensIncluded.toLocaleString()} tokens/cycle</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>${checkoutPlan.price}</Typography>
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <TextField label="Card number" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 19 } }} />
            <TextField label="Cardholder name" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} fullWidth size="small" />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="Expiry (MM/YY)" placeholder="12/28" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { maxLength: 5 } }} />
              <TextField label="CVC" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} fullWidth size="small" slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }} />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Sandbox gateway: any card succeeds. Cards starting with <b>4000</b> simulate a decline.
          </Typography>
          {checkoutMsg?.type === 'error' && <Alert severity="error" sx={{ mt: 1.5 }}>{checkoutMsg.text}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutPlan(null)} disabled={processing}>Cancel</Button>
          <Button variant="contained" onClick={submitCheckout} disabled={processing || !cardNumber}>
            {processing ? <CircularProgress size={18} color="inherit" /> : `Pay $${checkoutPlan?.price ?? 0}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelDialogOpen} onClose={() => !processing && setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel subscription</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Your <b>{currentPlan}</b> subscription will end and you will be moved to the Free plan. No refund is issued for the current billing cycle.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={processing}>Keep plan</Button>
          <Button color="error" variant="contained" onClick={submitCancel} disabled={processing}>
            {processing ? <CircularProgress size={18} color="inherit" /> : 'Cancel subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
