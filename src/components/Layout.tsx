import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowUpRight, Bell, ChevronRight, CircleHelp, Compass, Crown,
  LayoutDashboard, ListVideo, Menu, Play, Radio, Search, Star,
  Trophy, Users, Video, X, Zap, Volume2, Sun, Moon, Heart,
} from 'lucide-react';

const navItems = [
  { label: 'Game Time', icon: LayoutDashboard, path: '/' },
  { label: 'Live now', icon: Radio, path: '/watch' },
  { label: 'Match centre', icon: Trophy, path: '/matches' },
  { label: 'Penalty Rush', icon: Zap, path: '/penalty-rush' },
  { label: 'Discover', icon: Compass, path: '/matches' },
  { label: 'Live match maps', icon: Radio, path: '/live-map' },
  { label: 'Pleziah', icon: Heart, path: '/pleziah' },
  { label: 'My games', icon: Star, path: '/dashboard' },
];

function Logo() {
  return (
    <div className="brand-lockup" aria-label="SURESTREAM home">
      <div className="brand-mark"><img src="/favicon.svg" alt="" width="32" height="32" /></div>
      <div>
        <div className="brand-name">SURE<span>STREAM</span></div>
        <div className="brand-tagline">Football · Creator experiences</div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem('surestream-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('surestream-theme', theme); } catch { /* Storage may be disabled. */ }
  }, [theme]);

  const activeNav = navItems.find((n) => n.path === location.pathname)?.label ?? 'Game Time';
  const isStudio = location.pathname === '/streamer-studio';

  const selectNav = (path: string) => {
    navigate(path);
    setMobileNav(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={19} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-icon">R</div>
          <div>
            <strong>SURESTREAM</strong>
            <span>Matchday workspace</span>
          </div>
          <ChevronRight size={15} />
        </div>
        <nav className="side-nav">
          {navItems.map(({ label, icon: Icon, badge, path }) => (
            <button
              className={activeNav === label ? 'active' : ''}
              key={label}
              onClick={() => selectNav(path)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {badge && <b>{badge}</b>}
            </button>
          ))}
          <div className="nav-divider" />
          <button
            className={isStudio ? 'active' : ''}
            onClick={() => selectNav('/streamer-studio')}
          >
            <Video size={17} />
            <span>Streamer Studio</span>
            <span className="new-dot" />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Crown size={17} /></div>
            <strong>Take your seat</strong>
            <p>Enter The Stands with the best view of the game.</p>
            <button onClick={() => navigate('/watch')}>Open The Stands <ArrowUpRight size={14} /></button>
          </div>
          <div className="user-card">
            <div className="avatar lime large">G</div>
            <div>
              <strong>Guest</strong>
              <span>Browsing · Free stand</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{isStudio ? 'Streamer Studio' : activeNav}</strong>
          </div>
          <div className="top-actions">
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search matches, teams..." />
            </div>
            <button className="icon-button theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="help-button"><CircleHelp size={16} /> Help</button>
            <div className="top-avatar">G</div>
          </div>
        </header>

        <main className="main-content">{children}</main>
      </div>

      <nav className="mobile-bottom">
        <button className={activeNav === 'Game Time' ? 'active' : ''} onClick={() => selectNav('/')}>
          <LayoutDashboard size={18} /><span>Home</span>
        </button>
        <button onClick={() => selectNav('/watch')}>
          <Radio size={18} /><span>Live</span><i />
        </button>
        <button onClick={() => selectNav('/matches')}>
          <Compass size={18} /><span>Matches</span>
        </button>
        <button onClick={() => selectNav('/penalty-rush')}>
          <Zap size={18} /><span>Game</span>
        </button>
        <button onClick={() => selectNav('/streamer-studio')}>
          <Video size={18} /><span>Studio</span>
        </button>
      </nav>
    </div>
  );
}
