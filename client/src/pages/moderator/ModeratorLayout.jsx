import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/moderate', label: 'Dashboard', end: true },
  { to: '/moderate/polls', label: 'Polls' },
  { to: '/moderate/rewards', label: 'Rewards' },
  { to: '/moderate/goals', label: 'Goals' },
  { to: '/moderate/claims', label: 'Claims' },
];

export default function ModeratorLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-52 bg-gray-800 text-white flex flex-col p-4">
        <div className="font-black text-lg mb-6 tracking-widest uppercase text-orange-300">Moderator</div>
        <nav className="flex-1 space-y-1">
          {NAV.map(n => (
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
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
