import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import AgeGate from '@/components/AgeGate';
import LandingPage from '@/pages/LandingPage';
import PenaltyRush from '@/pages/PenaltyRush';
import { WatchPage, StudioPage, PlaceholderPage } from '@/pages/WatchStudio';
import SeatsPage from '@/pages/SeatsPage';
import AuthCallback from '@/pages/AuthCallback';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { PartnersPage } from '@/pages/PartnersPage';
import MatchDetailsPage from '@/pages/MatchDetailsPage';
import MatchesPage from '@/pages/MatchesPage';
import ProfilePage from '@/pages/ProfilePage';
import LiveMapPage from '@/pages/LiveMapPage';
import { PleziahPage, CreatorDashboardPage, PleziahAdminPage } from '@/pages/PleziahHub';

export default function App() {
  return (
    <BrowserRouter>
      <AgeGate />
      <Routes>
        <Route path="/" element={<Layout><LandingPage /></Layout>} />
        <Route path="/pleziah" element={<Layout><PleziahPage /></Layout>} />
        <Route path="/creator/dashboard" element={<Layout><CreatorDashboardPage /></Layout>} />
        <Route path="/admin/pleziah" element={<Layout><PleziahAdminPage /></Layout>} />
        <Route path="/penalty-rush" element={<ComingSoonPage />} />
        <Route path="/penalty-rush/challenge/:code" element={<ComingSoonPage />} />
        <Route path="/watch" element={<Layout><WatchPage /></Layout>} />
        <Route path="/watch/:id" element={<Layout><WatchPage /></Layout>} />
        <Route path="/streamer-studio" element={<Layout><StudioPage /></Layout>} />
        <Route path="/matches" element={<Layout><MatchesPage /></Layout>} />
        <Route path="/live-map" element={<Layout><LiveMapPage /></Layout>} />
        <Route path="/match/:id" element={<Layout><MatchDetailsPage /></Layout>} />
        <Route path="/seats/:eventId" element={<Layout><SeatsPage /></Layout>} />
        <Route path="/fan-zone" element={<Layout><MatchesPage /></Layout>} />
        <Route path="/teams" element={<Layout><PlaceholderPage title="Teams" description="Browse team information, squads, and fixtures." /></Layout>} />
        <Route path="/teams/:id" element={<Layout><PlaceholderPage title="Team Details" description="Team information, recent results, and upcoming fixtures." /></Layout>} />
        <Route path="/my-games" element={<Layout><PlaceholderPage title="My Games" description="Your watchlist and saved games." /></Layout>} />
        <Route path="/partners" element={<Layout><PartnersPage /></Layout>} />
        <Route path="/pricing" element={<Layout><PlaceholderPage title="Pricing" description="Free, Standard, and VIP access tiers. Payments require provider setup." /></Layout>} />
        <Route path="/dashboard" element={<Layout><PlaceholderPage title="Dashboard" description="Your account dashboard. Sign in to view your reservations, game history, and favorites." /></Layout>} />
        <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
        <Route path="/settings" element={<Layout><PlaceholderPage title="Settings" description="Account and application settings." /></Layout>} />
        <Route path="/payments" element={<Layout><PlaceholderPage title="Payments" description="Payment history and transaction status." /></Layout>} />
        <Route path="/auth/callback" element={<Layout><AuthCallback /></Layout>} />
        <Route path="/admin" element={<Layout><PlaceholderPage title="Admin" description="Protected administration area. Requires admin authorization." /></Layout>} />
        <Route path="/privacy" element={<Layout><PlaceholderPage title="Privacy Policy" description="How SURESTREAM handles your data." /></Layout>} />
        <Route path="/terms" element={<Layout><PlaceholderPage title="Terms of Service" description="The terms and conditions for using SURESTREAM." /></Layout>} />
        <Route path="/contact" element={<Layout><PlaceholderPage title="Contact" description="Get in touch with the SURESTREAM team." /></Layout>} />
        <Route path="*" element={<Layout><PlaceholderPage title="Page Not Found" description="The page you are looking for does not exist." /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
