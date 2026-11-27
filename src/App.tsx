import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AgeGate from '@/components/AgeGate';
import AuthCallback from '@/pages/AuthCallback';
import { PleziahPage, CreatorDashboardPage, PleziahAdminPage } from '@/pages/PleziahHub';
import AdultMarketplace from '@/pages/AdultMarketplace';

export default function App() {
  return <BrowserRouter><AgeGate /><Routes>
    <Route path='/' element={<Layout><PleziahPage /></Layout>} />
    <Route path='/pleziah' element={<Navigate to='/' replace />} />
    <Route path='/marketplace' element={<Layout><AdultMarketplace /></Layout>} />
    <Route path='/creator/dashboard' element={<Layout><CreatorDashboardPage /></Layout>} />
    <Route path='/admin/pleziah' element={<PleziahAdminPage />} />
    <Route path='/admin' element={<Navigate to='/admin/pleziah' replace />} />
    <Route path='/auth/callback' element={<Layout><AuthCallback /></Layout>} />
    <Route path='/privacy' element={<Layout><section className='pz-page'><h1>Privacy & discretion</h1><p>Privacy information for Pleziah members and creators.</p></section></Layout>} />
    <Route path='/terms' element={<Layout><section className='pz-page'><h1>Terms of service</h1><p>Terms for an adults-only creator platform.</p></section></Layout>} />
    <Route path='*' element={<Navigate to='/' replace />} />
  </Routes></BrowserRouter>;
}
