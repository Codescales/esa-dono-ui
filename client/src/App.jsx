import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import MyWallet from './pages/MyWallet.jsx';
import Rewards from './pages/Rewards.jsx';
import Polls from './pages/Polls.jsx';
import Goals from './pages/Goals.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminRewards from './pages/admin/AdminRewards.jsx';
import AdminPolls from './pages/admin/AdminPolls.jsx';
import AdminGoals from './pages/admin/AdminGoals.jsx';
import AdminDonations from './pages/admin/AdminDonations.jsx';
import AdminSimulate from './pages/admin/AdminSimulate.jsx';
import AdminBlockedWords from './pages/admin/AdminBlockedWords.jsx';
import ModeratorLayout from './pages/moderator/ModeratorLayout.jsx';
import ModeratorDashboard from './pages/moderator/ModeratorDashboard.jsx';
import ModeratorPolls from './pages/moderator/ModeratorPolls.jsx';
import ModeratorRewards from './pages/moderator/ModeratorRewards.jsx';
import ModeratorGoals from './pages/moderator/ModeratorGoals.jsx';
import ModeratorClaims from './pages/moderator/ModeratorClaims.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="rewards" element={<AdminRewards />} />
          <Route path="polls" element={<AdminPolls />} />
          <Route path="goals" element={<AdminGoals />} />
          <Route path="donations" element={<AdminDonations />} />
          <Route path="simulate" element={<AdminSimulate />} />
          <Route path="blocked-words" element={<AdminBlockedWords />} />
        </Route>
        <Route path="/moderate" element={<ModeratorLayout />}>
          <Route index element={<ModeratorDashboard />} />
          <Route path="polls" element={<ModeratorPolls />} />
          <Route path="rewards" element={<ModeratorRewards />} />
          <Route path="goals" element={<ModeratorGoals />} />
          <Route path="claims" element={<ModeratorClaims />} />
        </Route>
        <Route path="*" element={
          <div className="min-h-screen">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/wallet" element={<MyWallet />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/polls" element={<Polls />} />
              <Route path="/goals" element={<Goals />} />
            </Routes>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
