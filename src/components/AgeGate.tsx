import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'pleziah-age-confirmed-v1';
const ADULT_ROUTES = ['/pleziah', '/creator/dashboard', '/admin/pleziah'];
export default function AgeGate() {
  const location = useLocation(); const navigate = useNavigate();
  const isAdultRoute = ADULT_ROUTES.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const [visible, setVisible] = useState(false); const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!isAdultRoute) { setVisible(false); setDenied(false); return; }
    try { setVisible(localStorage.getItem(STORAGE_KEY) !== 'yes'); }
    catch { setVisible(true); }
  }, [isAdultRoute, location.pathname]);
  const confirm = () => {
    try { localStorage.setItem(STORAGE_KEY, 'yes'); } catch { /* Gate still works for this page view. */ }
    setVisible(false);
  };
  if (!visible || !isAdultRoute) return null;
  return <div className="age-gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
    <div className="age-gate-card pz-age-gate-card">
      <div className="pz-age-mark">P</div>
      <span className="eyebrow">PLEZIAH · ADULTS ONLY</span>
      <h2 id="age-gate-title">Are you 18 or older?</h2>
      {denied ? <><p>You cannot enter Pleziah. You can return to the football experience.</p><button className="dark-button" onClick={() => navigate('/', { replace: true })}>Return to football</button></> : <>
        <p>This section is for adults only. Confirm that you are at least 18 before entering. This declaration is not identity verification.</p>
        <button className="lime-button age-gate-confirm" onClick={confirm}><ShieldCheck size={17} /> I am 18 or older — enter</button>
        <button className="dark-button age-gate-deny" onClick={() => setDenied(true)}>I am under 18</button>
        <small>Respect, consent, creator rights and privacy come first.</small>
      </>}
    </div>
  </div>;
}
