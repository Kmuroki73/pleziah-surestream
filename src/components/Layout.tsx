import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Heart, Store, Radio, UserRound, ShieldCheck } from 'lucide-react';

const navItems = [
  { label: 'Discover', icon: Heart, path: '/' },
  { label: 'Live', icon: Radio, path: '/#live' },
  { label: 'Marketplace', icon: Store, path: '/marketplace' },
  { label: 'Creator studio', icon: UserRound, path: '/creator/dashboard' },
];
function Logo() { return <button className='brand-lockup' aria-label='Pleziah home' onClick={() => { window.location.href = '/'; }}><div className='brand-mark'><span>P</span></div><div><div className='brand-name'>PLEZIAH</div><div className='brand-tagline'>Adults only · Creator world</div></div></button>; }
export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate(); const location = useLocation(); const [mobileNav, setMobileNav] = useState(false);
  const activeNav = navItems.find(n => n.path === location.pathname)?.label ?? (location.pathname.startsWith('/creator') ? 'Creator studio' : location.pathname.startsWith('/marketplace') ? 'Marketplace' : 'Discover');
  const selectNav = (path: string) => { if(path.includes('#')) { navigate('/'); window.setTimeout(() => document.getElementById('live')?.scrollIntoView({behavior:'smooth'}), 80); } else navigate(path); setMobileNav(false); };
  return <div className='app-shell pz-shell'><div className='main-area'>
    <header className='v32-topbar pz-topbar'><div className='v32-brand'><Logo /></div>
      <button className='icon-button v32-mobile-menu' onClick={() => setMobileNav(!mobileNav)} aria-label='Toggle navigation'><Menu size={19}/></button>
      <nav className={'v32-nav ' + (mobileNav ? 'is-open' : '')} aria-label='Main navigation'>{navItems.map(({label,icon:Icon,path}) => <button key={label} className={activeNav===label?'active':''} onClick={()=>selectNav(path)}><Icon size={16}/><span>{label}</span></button>)}</nav>
      <div className='v32-top-actions'><button className='v32-account' onClick={()=>selectNav('/creator/dashboard')}>Join Pleziah <span>↗</span></button></div>
    </header>
    <main className='main-content v32-content'>{children}</main>
    <footer className='v32-footer pz-footer-shell'><span>© PLEZIAH</span><span>18+ only · Consent-led creator community · Private by design</span><button onClick={()=>selectNav('/admin/pleziah')}><ShieldCheck size={14}/> Admin</button></footer>
  </div><nav className='mobile-bottom v32-mobile-bottom' aria-label='Mobile navigation'>{navItems.map(({label,icon:Icon,path})=><button key={label} className={activeNav===label?'active':''} onClick={()=>selectNav(path)}><Icon size={18}/><span>{label}</span></button>)}</nav></div>;
}
