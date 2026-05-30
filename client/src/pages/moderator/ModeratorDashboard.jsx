import { useEffect, useState } from 'react';
import moderatorClient from '../../api/moderator.js';
import Card from '../../components/Card.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

export default function ModeratorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    moderatorClient.get('/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Moderator Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-2xl font-bold text-purple-600">{stats.pending_entries}</div>
          <div className="text-sm text-gray-500">Pending Entries</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-purple-600">{stats.active_polls}</div>
          <div className="text-sm text-gray-500">Active Polls</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-purple-600">{stats.total_rewards}</div>
          <div className="text-sm text-gray-500">Active Rewards</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-purple-600">{stats.total_goals}</div>
          <div className="text-sm text-gray-500">Active Goals</div>
        </Card>
      </div>
    </div>
  );
}
