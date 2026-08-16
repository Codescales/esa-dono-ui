import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { CheckBadgeIcon } from '../components/icons';
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
  const { loading, openDrawer, hasVisited } = useCart();
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
  const tabIndex = TABS.indexOf(tab);
  const isLastTab = tabIndex === TABS.length - 1;

  const goPrevious = () => {
    if (tabIndex > 0) selectTab(TABS[tabIndex - 1]!);
  };

  const goNext = () => {
    if (tabIndex < TABS.length - 1) selectTab(TABS[tabIndex + 1]!);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Tab bar — still clickable for jumping directly to a category, but
          the footer Previous/Next buttons below are the primary path so a
          first-time donor is naturally carried through every category
          instead of checking out after only seeing the first one. A
          checkmark marks any category the donor has already opened. */}
      <div className="flex justify-center gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => selectTab(t)}
            className={`flex items-center gap-1.5 font-data font-bold text-sm tracking-wider lowercase px-4 py-2 rounded-sm transition-colors ${
              tab === t ? 'text-black' : 'text-off-white/55 hover:text-off-white'
            }`}
            style={{ background: tab === t ? 'var(--d-yellow)' : 'rgba(239,238,236,.08)' }}
          >
            {t}
            {hasVisited(t) && (
              <CheckBadgeIcon
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: tab === t ? 'black' : 'var(--green)' }}
                data-testid={`visited-check-${t}`}
              />
            )}
          </button>
        ))}
      </div>

      <div className={`transition-all duration-300 ${slideClass}`}>
        {tab === 'rewards' && <RewardList />}
        {tab === 'polls' && <PollList />}
        {tab === 'goals' && <GoalList />}
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={goPrevious}
          disabled={tabIndex === 0}
          className="btrl-button btrl-button-outline"
        >
          &larr; previous
        </button>
        {isLastTab ? (
          <button onClick={openDrawer} className="btrl-button text-lg py-3 px-8">
            review &amp; checkout
          </button>
        ) : (
          <button onClick={goNext} className="btrl-button">
            next &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
