import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import RewardList from '../components/incentives/RewardList';
import PollList from '../components/incentives/PollList';
import GoalList from '../components/incentives/GoalList';

const TABS = ['rewards', 'polls', 'goals'] as const;
type Tab = (typeof TABS)[number];

/** Map a pathname to the tab it should activate. /donate (and anything else
 * under the public tree) defaults to rewards — the same default the old
 * stepper's first step used. */
function tabFromPathname(pathname: string): Tab {
  if (pathname.startsWith('/polls')) return 'polls';
  if (pathname.startsWith('/goals')) return 'goals';
  return 'rewards';
}

export default function DonateFlow() {
  const { loading, openDrawer } = useCart();
  const location = useLocation();

  const [tab, setTab] = useState<Tab>(() => tabFromPathname(location.pathname));
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  // /rewards, /polls, /goals, and /donate all render this same component
  // instance at the same position in the tree, so React won't remount it on
  // navigation between them — sync the active tab to the URL explicitly
  // whenever the pathname changes (e.g. a donor clicks a Navbar link while
  // already on this page).
  useEffect(() => {
    setTab(tabFromPathname(location.pathname));
  }, [location.pathname]);

  const selectTab = (next: Tab) => {
    const nextIndex = TABS.indexOf(next);
    const currentIndex = TABS.indexOf(tab);
    setDirection(nextIndex >= currentIndex ? 'next' : 'prev');
    setTab(next);
  };

  if (loading) return <LoadingSpinner />;

  const slideClass = direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Tab bar — browsing rewards/polls/goals is unordered; donors can jump
          straight to whichever category they care about. The cart drawer
          (opened from here or the Navbar) is the only checkout surface, and
          nudges about any category a donor hasn't looked at yet. */}
      <div className="flex justify-center gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => selectTab(t)}
            className={`font-data font-bold text-sm tracking-wider lowercase px-4 py-2 rounded-sm transition-colors ${
              tab === t ? 'text-black' : 'text-off-white/55 hover:text-off-white'
            }`}
            style={{ background: tab === t ? 'var(--d-yellow)' : 'rgba(239,238,236,.08)' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={`transition-all duration-300 ${slideClass}`}>
        {tab === 'rewards' && <RewardList />}
        {tab === 'polls' && <PollList />}
        {tab === 'goals' && <GoalList />}
      </div>

      <div className="flex justify-center mt-8">
        <button onClick={openDrawer} className="btrl-button text-lg py-3 px-8">
          review &amp; checkout
        </button>
      </div>
    </div>
  );
}
