import { useEffect, useState } from 'react';
import { getCampaign } from '../api/campaign.js';
import ProgressBar from '../components/ProgressBar.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export default function Home() {
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCampaign().then(setCampaign).catch(() => setError('Failed to load campaign data.'));
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!campaign) return <LoadingSpinner />;

  const raised = campaign.amount_raised?.value
    ? Math.round(parseFloat(campaign.amount_raised.value) * 100)
    : campaign.total_amount_raised?.value
    ? Math.round(parseFloat(campaign.total_amount_raised.value) * 100)
    : 0;
  const goal = campaign.goal?.value
    ? Math.round(parseFloat(campaign.goal.value) * 100)
    : campaign.fundraising_goal?.value
    ? Math.round(parseFloat(campaign.fundraising_goal.value) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-purple-700 mb-2">{campaign.name ?? campaign.title ?? 'Campaign'}</h1>
      {campaign.description && <p className="text-gray-600 mb-6">{campaign.description}</p>}
      {campaign.logo?.src && (
        <img src={campaign.logo.src} alt="Campaign logo" className="w-48 mb-6 rounded" />
      )}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between mb-2">
          <span className="font-semibold text-gray-700">Raised</span>
          <span className="font-bold text-purple-700">{fmt(raised)} / {fmt(goal)}</span>
        </div>
        <ProgressBar value={raised} max={goal} />
        <p className="text-center text-sm text-gray-500 mt-2">{goal > 0 ? `${Math.round((raised / goal) * 100)}% of goal` : ''}</p>
      </div>
    </div>
  );
}
