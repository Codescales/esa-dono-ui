import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getDonor } from '../api/donor.js';
import { clearDonorToken } from '../utils/authToken.js';

function fmt(cents) { return `$${(cents / 100).toFixed(2)}`; }

export default function Navbar() {
  const [donor, setDonor] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const refresh = () => {
      const token = localStorage.getItem('donor_token');
      if (!token) { setDonor(null); return; }
      getDonor().then(setDonor).catch(() => setDonor(null));
    };
    refresh();
    window.addEventListener('donor-token-changed', refresh);
    return () => window.removeEventListener('donor-token-changed', refresh);
  }, [location.pathname, location.search]);

  const logout = () => {
    clearDonorToken();
    setDonor(null);
  };

  return (
    <nav className="text-white px-6 py-4 flex items-center gap-6 border-b" style={{ background: 'linear-gradient(90deg, var(--esa-bg-deep), var(--esa-purple), var(--esa-bg-deep))', borderColor: 'var(--esa-border)' }}>
      <Link to="/" className="font-black text-lg tracking-widest uppercase text-orange-300">ESA Dono</Link>
      <NavLink to="/" end className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Home</NavLink>
      <NavLink to="/wallet" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>My Wallet</NavLink>
      <NavLink to="/rewards" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Rewards</NavLink>
      <NavLink to="/polls" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Polls</NavLink>
      <NavLink to="/goals" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Goals</NavLink>
      <div className="ml-auto flex items-center gap-4">
        {donor && (
          <div className="hidden lg:flex flex-col text-right leading-tight">
            <span className="text-xs uppercase tracking-widest text-purple-200">Logged in as</span>
            <span className="text-sm font-semibold">{donor.email} · {fmt(donor.balance_remaining)}</span>
          </div>
        )}
        {donor?.is_moderator && (
          <NavLink to="/moderate" className="text-purple-200 hover:text-white text-sm">Moderate</NavLink>
        )}
        {donor ? (
          <button onClick={logout} className="text-purple-200 hover:text-white text-sm">Logout</button>
        ) : (
          <NavLink to="/wallet" className="text-purple-200 hover:text-white text-sm">Login</NavLink>
        )}
        <NavLink to="/admin" className="text-purple-200 hover:text-white text-sm">Admin</NavLink>
      </div>
    </nav>
  );
}
