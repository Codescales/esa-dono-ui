import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DonateFlow from '../../src/pages/DonateFlow';
import { CartProvider } from '../../src/context/CartContext';

vi.mock('../../src/api/rewards', () => ({
  getRewards: vi.fn(),
}));
vi.mock('../../src/api/polls', () => ({
  getPolls: vi.fn(),
}));
vi.mock('../../src/api/goals', () => ({
  getGoals: vi.fn(),
}));

import { getRewards } from '../../src/api/rewards';
import { getPolls } from '../../src/api/polls';
import { getGoals } from '../../src/api/goals';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <DonateFlow />
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('DonateFlow (tabbed browse page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getPolls).mockResolvedValue([]);
    vi.mocked(getGoals).mockResolvedValue([]);
  });

  it('renders the rewards tab when visiting /rewards', async () => {
    localStorage.setItem('donor_token', 'test-token');
    vi.mocked(getRewards).mockResolvedValue([
      {
        id: '1',
        title: 'Digital Reward',
        description: 'A digital item',
        type: 'DIGITAL',
        cost_cents: 500,
        quantity_total: null,
        quantity_claimed: 0,
        is_active: true,
      },
      {
        id: '2',
        title: 'Physical Reward',
        description: 'A physical item',
        type: 'PHYSICAL',
        cost_cents: 1000,
        quantity_total: 10,
        quantity_claimed: 3,
        is_active: true,
      },
    ]);

    renderAt('/rewards');

    expect(await screen.findByText('Digital Reward')).toBeDefined();
    expect(screen.getByText('Physical Reward')).toBeDefined();
  });

  it('defaults to the rewards tab when visiting /donate', async () => {
    vi.mocked(getRewards).mockResolvedValue([
      {
        id: '1',
        title: 'Digital Reward',
        description: 'A digital item',
        type: 'DIGITAL',
        cost_cents: 500,
        quantity_total: null,
        quantity_claimed: 0,
        is_active: true,
      },
    ]);

    renderAt('/donate');

    expect(await screen.findByText('Digital Reward')).toBeDefined();
  });

  it('adds a reward to the cart without collecting an address (Stripe collects it)', async () => {
    vi.mocked(getRewards).mockResolvedValue([
      {
        id: '2',
        title: 'Physical Reward',
        description: 'A physical item',
        type: 'PHYSICAL',
        cost_cents: 1000,
        quantity_total: 10,
        quantity_claimed: 3,
        is_active: true,
      },
    ]);

    renderAt('/rewards');

    const addButton = await screen.findByText('add');
    addButton.click();

    expect(await screen.findByText('remove')).toBeDefined();
  });

  it('switches to the polls tab when clicked', async () => {
    vi.mocked(getRewards).mockResolvedValue([]);
    vi.mocked(getPolls).mockResolvedValue([
      {
        id: 'p1',
        title: 'Favorite game',
        options: [],
        total_votes_cents: 0,
        is_active: true,
        allow_custom_entries: false,
      },
    ]);

    renderAt('/rewards');

    const pollsTabButtons = await screen.findAllByText('polls');
    pollsTabButtons[0]!.click();

    expect(await screen.findByText('Favorite game')).toBeDefined();
  });
});
