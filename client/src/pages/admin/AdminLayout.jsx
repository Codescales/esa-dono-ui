import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/donors', label: 'Donors' },
  { to: '/admin/rewards', label: 'Rewards' },
  { to: '/admin/polls', label: 'Polls' },
  { to: '/admin/goals', label: 'Goals' },
  { to: '/admin/donations', label: 'Donations & Claims' },
  { to: '/admin/blocked-words', label: 'Blocked Words' },
  { to: '/admin/simulate', label: 'Simulate' },
];

export default function AdminLayout() {
  const [key, setKey] = useState(localStorage.getItem('admin_key') ?? '');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const isLoggedIn = !!key;

  const login = () => {
    if (!input.trim()) {
      setError('Enter API key');
      return;
    }
    localStorage.setItem('admin_key', input.trim());
    setKey(input.trim());
    setError('');
  };

  const logout = () => {
    localStorage.removeItem('admin_key');
    setKey('');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="esa-panel rounded-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4">Admin Login</h1>
          <input
            type="password"
            placeholder="Enter admin API key"
            className="w-full border rounded px-3 py-2 mb-3 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <button
            onClick={login}
            className="w-full bg-purple-600 text-white rounded py-2 hover:bg-purple-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-52 bg-gray-800 text-white flex flex-col p-4">
        <div className="font-black text-lg mb-6 tracking-widest uppercase text-orange-300">
          Admin
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-purple-600' : 'hover:bg-gray-700'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-white mt-4">
          Logout
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
