import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Radio, Search, Trophy, Heart, BookOpen, CalendarDays,
} from 'lucide-react';

const navItems = [
  { label: 'Football', icon: Trophy, path: '/' },
  { label: 'Live matches', icon: Radio, path: '/watch' },
  { label: 'Fixtures', icon: CalendarDays, path: '/matches' },
  { label: 'PLEZIAH', icon: Heart, path: '/pleziah' },
  { label: 'E-LIBRARY', icon: BookOpen, path: '/library' },
];

function Logo() {
  return <button className="brand-lockup" aria-label="SURESTREAM home" onClick={() => { window.location.href = '/'; }}>
    <div className="brand-mark"><img src="/favicon.svg" alt="" width="32" height="32" /></div>
    <div><div className="brand-name">SURE<span>STREAM</span></div><div className="brand-tagline">Football · Culture · Creators</div></div>
  </button>;
}

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const activeNav = navItems.find((n) => n.path === location.pathname)?.label ?? (location.pathname.startsWith('/match') ? 'Fixtures' : location.pathname.startsWith('/creator') ? 'PLEZIAH' : 'Football');
  const selectNav = (path: string) => { navigate(path); setMobileNav(false); };
  return <div className="app-shell v32-shell">
    <div className="main-area">
      <header className="v32-topbar">
        <div className="v32-brand"><Logo /></div>
        <button className="icon-button v32-mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={19}/></button>
        <nav className={`v32-nav ${mobileNav ? 'is-open' : ''}`} aria-label="Main navigation">
          {navItems.map(({label,icon:Icon,path}) => <button key={label} className={activeNav===label?'active':''} onClick={()=>selectNav(path)}><Icon size={16}/><span>{label}</span></button>)}
        </nav>
        <div className="v32-top-actions"><label className="v32-search"><Search size={16}/><input aria-label="Search" placeholder="Search matches, creators, books" onKeyDown={e=>{if(e.key==='Enter') navigate('/matches');}}/></label><button className="v32-account" onClick={()=>selectNav('/profile')}>Account <span>↗</span></button></div>
      </header>
      <main className="main-content v32-content">{children}</main>
      <footer className="v32-footer"><span>© SURESTREAM</span><span>Live data where available · Creator-first discovery · 18+ area access controlled</span><button onClick={()=>selectNav('/partners')}>Partners</button></footer>
    </div>
    <nav className="mobile-bottom v32-mobile-bottom" aria-label="Mobile navigation">{navItems.slice(0,4).map(({label,icon:Icon,path})=><button key={label} className={activeNav===label?'active':''} onClick={()=>selectNav(path)}><Icon size={18}/><span>{label==='Live matches'?'Live':label}</span></button>)}</nav>
  </div>;
}
