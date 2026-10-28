import { StrictMode, Component, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('SURESTREAM failed to render:', error); }
  render() {
    if (this.state.failed) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#080a09',color:'#f7f8f3',fontFamily:'system-ui,sans-serif'}}><section style={{maxWidth:520,textAlign:'center'}}><h1 style={{color:'#c6ff2e'}}>SURESTREAM needs a refresh</h1><p>The app hit a display error. Refresh this page. If it continues, open the site in a private window to rule out a stale cached version.</p><button style={{padding:'12px 18px',border:0,borderRadius:8,background:'#c6ff2e',fontWeight:700,cursor:'pointer'}} onClick={() => window.location.reload()}>Refresh app</button></section></main>;
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('SURESTREAM could not find its root element. Check index.html.');
createRoot(rootElement).render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline shell registration failed', error));
  });
}
