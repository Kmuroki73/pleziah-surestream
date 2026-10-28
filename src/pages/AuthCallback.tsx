import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing secure sign-in…');
  useEffect(() => {
    let active = true;
    const finish = async () => {
      if (!supabase) { setMessage('Authentication is not configured for this deployment.'); return; }
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) { setMessage(error.message); return; }
      if (data.session) { setMessage('Signed in. Returning to your experience…'); let destination = '/seats/featured-match'; try { const saved = localStorage.getItem('pleziah-auth-return'); if (saved && saved.startsWith('/') && !saved.startsWith('//')) destination = saved; localStorage.removeItem('pleziah-auth-return'); } catch { /* Continue to safe default. */ } setTimeout(() => navigate(destination, { replace: true }), 350); }
      else setMessage('Sign-in link could not be verified. Request a new link and try again.');
    };
    finish();
    return () => { active = false; };
  }, [navigate]);
  return <div className="booking-page"><div className="booking-card"><h1>SURESTREAM sign-in</h1><p>{message}</p></div></div>;
}
