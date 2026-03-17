import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-purple-700 text-white px-6 py-3 flex items-center gap-6">
      <Link to="/" className="font-bold text-lg">DonoPlatform</Link>
      <NavLink to="/" end className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Home</NavLink>
      <NavLink to="/wallet" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>My Wallet</NavLink>
      <NavLink to="/rewards" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Rewards</NavLink>
      <NavLink to="/polls" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Polls</NavLink>
      <NavLink to="/goals" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Goals</NavLink>
      <div className="ml-auto">
        <NavLink to="/admin" className="text-purple-200 hover:text-white text-sm">Admin</NavLink>
      </div>
    </nav>
  );
}
