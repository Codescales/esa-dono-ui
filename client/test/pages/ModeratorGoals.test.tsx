import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const moderatorClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/api/moderator', () => ({ default: moderatorClient }));

import { ModeratorChannelFilterProvider } from '../../src/context/ModeratorChannelFilterContext';
import ModeratorGoals from '../../src/pages/moderator/ModeratorGoals';

const goal = {
  id: 'g1',
  title: 'Race entry',
  description: null,
  current_cents: 750,
  target_cents: 2000,
  is_active: true,
  is_complete: false,
  channel_id: null,
};

describe('ModeratorGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists fund goals', async () => {
    moderatorClient.get.mockImplementation((path: string) =>
      Promise.resolve({ data: path === '/goals' ? [goal] : [] }),
    );

    render(
      <ModeratorChannelFilterProvider>
        <ModeratorGoals />
      </ModeratorChannelFilterProvider>,
    );

    expect(await screen.findByText('Race entry')).toBeInTheDocument();
    expect(screen.getByText('$7.50 / $20.00')).toBeInTheDocument();
  });
});
