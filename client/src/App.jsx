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
        </Route>
        <Route path="*" element={
          <div className="min-h-screen bg-gray-50">
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
