import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  adminClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  uploadRewardImage: vi.fn(),
}));

vi.mock('../../src/api/admin', () => ({
  default: mocks.adminClient,
  uploadRewardImage: mocks.uploadRewardImage,
}));

import AdminRewards from '../../src/pages/admin/AdminRewards';

const reward = {
  id: 'r1',
  title: 'T-shirt',
  type: 'PHYSICAL',
  cost_cents: 2000,
  quantity_total: 10,
  quantity_claimed: 2,
  is_active: true,
};

describe('AdminRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists rewards', async () => {
    mocks.adminClient.get.mockImplementation((path: string) =>
      Promise.resolve({ data: path === '/rewards' ? [reward] : [] }),
    );

    render(<AdminRewards />);

    expect(await screen.findByText('T-shirt')).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
  });

  it('shows an empty table when there are no rewards', async () => {
    mocks.adminClient.get.mockResolvedValue({ data: [] });

    render(<AdminRewards />);

    expect(await screen.findByText('rewards')).toBeInTheDocument();
  });
});
