import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, Smartphone, Ticket, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Tier = 'standard' | 'vip' | 'vvip';
const TIERS: {id: Tier; name: string; price: number; capacity: number; note: string}[] = [
  { id: 'standard', name: 'STANDARD', price: 50, capacity: 6000, note: 'Match access where an authorized stream is available' },
  { id: 'vip', name: 'VIP', price: 50, capacity: 3000, note: 'Ad-free SURESTREAM interface · priority fan features' },
  { id: 'vvip', name: 'VVIP', price: 100, capacity: 1000, note: 'Limited premium tier · ad-free SURESTREAM interface' },
];
export default function SeatsPage() {
  const { eventId = 'featured-match' } = useParams();
  const navigate = useNavigate();
  const [tier, setTier] = useState<Tier>('standard');
  const [method, setMethod] = useState<'mpesa'|'paypal'>('mpesa');
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const selected = TIERS.find(t => t.id === tier)!;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setEmail(data.user?.email ?? ''); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setEmail(session?.user?.email ?? '');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!supabase) { setMessage('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment.'); return; }
    if (!email.trim()) { setMessage('Enter your email address first.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setBusy(false); setMessage(error ? error.message : 'Check your email for a secure sign-in link, then return to reserve your seat.');
  };

  const reserve = async () => {
    if (!supabase || !user) { setMessage('Sign in first to reserve a seat securely.'); return; }
    setBusy(true); setMessage('');
    const { data, error } = await supabase.from('reservations').insert({
      user_id: user.id, event_id: eventId, tier, amount_kes: selected.price,
      currency: 'KES', payment_method: method, payment_status: 'pending', access_status: 'locked',
    }).select('id').single();
    if (error || !data) { setBusy(false); setMessage(error?.message ?? 'Could not create reservation. Apply the supplied Supabase migration first.'); return; }
    setBookingId(data.id);
    if (method === 'paypal') {
      setBusy(false);
      setMessage('Reservation created. PayPal checkout must be enabled with server-side PayPal credentials before live payment can proceed.');
      return;
    }
    setBusy(false);
    setMessage('Reservation created as PENDING. Pay KSh ' + selected.price + ' to Pochi La Biashara 0182437651, then enter the M-PESA transaction code below. Access remains locked until payment is verified.');
  };

  const submitMpesa = async () => {
    if (!supabase || !user || !bookingId || !mpesaCode.trim()) { setMessage('Enter the M-PESA transaction code for your pending reservation.'); return; }
    setBusy(true);
    const { error } = await supabase.from('payment_submissions').insert({ reservation_id: bookingId, user_id: user.id, method: 'mpesa_manual', transaction_reference: mpesaCode.trim().toUpperCase() });
    setBusy(false);
    setMessage(error ? error.message : 'Payment reference submitted. Your reservation remains locked until an administrator verifies receipt. Do not submit a screenshot as proof of automatic payment.');
  };

  return <div className="booking-page">
    <button className="icon-button" onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
    <div className="booking-heading"><span className="eyebrow">MATCHDAY CHECKOUT</span><h1>Take your seat.</h1><p>One reservation. Secure payment verification. Access only after confirmation.</p></div>
    <div className="booking-grid">
      <section className="booking-main">
        <div className="booking-card"><div className="booking-card-title"><Ticket/><div><h2>Choose your experience</h2><p>Event: {eventId}</p></div></div>
          <div className="tier-list">{TIERS.map(t => <button key={t.id} onClick={() => setTier(t.id)} className={`tier-option ${tier===t.id?'selected':''}`}><span className="tier-radio"/><span className="tier-copy"><strong>{t.name}</strong><small>{t.note}</small>{t.id==='vip' && <small>Maximum 3,000 VIP reservations per event</small>}{t.id==='vvip' && <small>Maximum 1,000 VVIP reservations per event</small>}</span><strong className="tier-price">KSh {t.price}</strong></button>)}</div>
        </div>
        <div className="booking-card"><div className="booking-card-title"><LockKeyhole/><div><h2>Your account</h2><p>Reservations are linked to your verified account.</p></div></div>
          {!isSupabaseConfigured ? <div className="inline-warning">Supabase is not configured. Add the project URL and publishable/anon key to enable account and reservation features.</div> : user ? <div className="signed-in"><CheckCircle2/><span>Signed in as <strong>{user.email}</strong></span></div> : <div className="auth-inline"><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><button className="lime-button" disabled={busy} onClick={signIn}>{busy?'Sending…':'Email me a secure sign-in link'}</button><button className="dark-button" disabled={busy||!supabase} onClick={async()=>{if(!supabase)return;const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback`}});if(error)setMessage(error.message)}}>Continue with Google</button></div>}
        </div>
        <div className="booking-card"><div className="booking-card-title"><CreditCard/><div><h2>Payment method</h2><p>Choose how you intend to pay.</p></div></div>
          <div className="payment-methods"><button className={method==='mpesa'?'selected':''} onClick={()=>setMethod('mpesa')}><Smartphone/><strong>M-PESA</strong><small>Pochi / approved collection</small></button><button className={method==='paypal'?'selected':''} onClick={()=>setMethod('paypal')}><CreditCard/><strong>PayPal</strong><small>Requires configured merchant credentials</small></button></div>
          {method==='mpesa' && <div className="mpesa-instructions"><strong>Pochi La Biashara</strong><div className="mpesa-number">0182437651</div><p>Pay KSh {selected.price}. Confirm the recipient name in your M-PESA app before sending. This manual route is not an automatic Safaricom API integration.</p></div>}
          {message && <div className="booking-message" role="status">{message}</div>}
          {bookingId && method==='mpesa' && <label className="mpesa-code-label">M-PESA transaction code<input value={mpesaCode} onChange={e=>setMpesaCode(e.target.value)} placeholder="e.g. QAB12XYZ" autoCapitalize="characters"/><small>Submitting a code does not unlock access. The payment must be verified by the backend/admin.</small></label>}
          <button className="lime-button checkout-button" disabled={busy||!user||!isSupabaseConfigured} onClick={bookingId&&method==='mpesa'?submitMpesa:reserve}>{busy?'Processing…':bookingId&&method==='mpesa'?'Submit payment reference':`Reserve · KSh ${selected.price}`}</button>
          <p className="secure-note"><ShieldCheck size={14}/> Payment is not considered successful until verified. Never share your account password or PIN.</p>
        </div>
      </section>
      <aside className="booking-summary"><span className="eyebrow">YOUR RESERVATION</span><h2>{selected.name} Seat</h2><div className="summary-line"><span>Entry</span><strong>KSh {selected.price}</strong></div><div className="summary-line"><span>Platform ads</span><strong>None for VIP/VVIP</strong></div><div className="summary-line"><span>Access</span><strong>After verified payment</strong></div><div className="summary-total"><span>Total</span><strong>KSh {selected.price}</strong></div><p>Viewing is available only when SURESTREAM has an authorized stream for this event. Third-party stream adverts and uptime cannot be controlled by SURESTREAM.</p></aside>
    </div>
  </div>;
}
