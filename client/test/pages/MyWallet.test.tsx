import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  getDonor: vi.fn(),
  requestToken: vi.fn(),
  getOAuthProviders: vi.fn(),
  track: vi.fn(),
  identifyDonor: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(),
  noteSessionEstablished: vi.fn(),
  clearSessionMarker: vi.fn(),
}));

vi.mock('../../src/api/donor', () => ({
  getDonor: mocks.getDonor,
  requestToken: mocks.requestToken,
}));
vi.mock('../../src/api/auth', () => ({ getOAuthProviders: mocks.getOAuthProviders }));
vi.mock('../../src/lib/tracing', () => ({
  track: mocks.track,
  identifyDonor: mocks.identifyDonor,
}));
vi.mock('../../src/utils/authToken', () => ({
  extractToken: (v: string) => (v || '').trim(),
  startSession: mocks.startSession,
  endSession: mocks.endSession,
  noteSessionEstablished: mocks.noteSessionEstablished,
  clearSessionMarker: mocks.clearSessionMarker,
}));

import MyWallet from '../../src/pages/MyWallet';

const wallet = {
  id: 'd1',
  email: 'alice@example.com',
  balance_remaining: 1000,
  total_donated: 5000,
  role: 'USER',
  donations: [],
  reward_claims: [],
  poll_votes: [],
  fund_contributions: [],
  custom_entries: [],
};

describe('MyWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOAuthProviders.mockResolvedValue({ providers: [] });
  });

  it('shows the login form when there is no session', async () => {
    mocks.getDonor.mockRejectedValue(new Error('no session'));

    render(
      <MemoryRouter>
        <MyWallet />
      </MemoryRouter>,
    );

    expect(await screen.findByText('access your wallet')).toBeInTheDocument();
  });

  it('shows the wallet when a donor is logged in', async () => {
    mocks.getDonor.mockResolvedValue(wallet);

    render(
      <MemoryRouter>
        <MyWallet />
      </MemoryRouter>,
    );

    expect(await screen.findByText('my wallet')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('No donations yet.')).toBeInTheDocument();
  });
});
