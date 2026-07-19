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
    getCampaign()
      .then(setCampaign)
      .catch(() => setError('Failed to load campaign data.'));
  }, []);

  if (error)
    return (
      <div className="p-8" style={{ color: 'var(--red)' }}>
        {error}
      </div>
    );
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
    <div className="max-w-3xl mx-auto p-8">
      <div className="text-center mb-8">
        <p className="font-mono text-[10px] font-bold tracking-[0.35em] uppercase text-d-yellow mb-2">
          European Speedrunner Assembly
        </p>
        <h1 className="font-display text-5xl lowercase text-off-white mb-2">
          {campaign.name ?? campaign.title ?? 'Campaign'}
        </h1>
      </div>
      {campaign.description && (
        <p className="text-off-white/55 mb-6 text-center font-body text-sm">
          {campaign.description}
        </p>
      )}
      {campaign.logo?.src && (
        <img src={campaign.logo.src} alt="Campaign logo" className="w-48 mb-6 rounded-sm mx-auto" />
      )}
      <div className="btrl-panel p-6">
        <div className="flex justify-between mb-2">
          <span className="font-data font-bold text-sm text-off-white/55">raised</span>
          <span className="font-data font-bold text-sm text-d-yellow">
            {fmt(raised)} / {fmt(goal)}
          </span>
        </div>
        <ProgressBar value={raised} max={goal} />
        <p className="text-center font-data text-sm text-off-white/55 mt-2">
          {goal > 0 ? `${Math.round((raised / goal) * 100)}% of goal` : ''}
        </p>
      </div>
    </div>
  );
}
