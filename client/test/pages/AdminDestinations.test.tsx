import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  getDestinations: vi.fn(),
  createDestination: vi.fn(),
  updateDestination: vi.fn(),
  rotateDestinationSecret: vi.fn(),
  deleteDestination: vi.fn(),
  getDestinationDeliveries: vi.fn(),
  testDestination: vi.fn(),
}));

vi.mock('../../src/api/admin', () => mocks);

import AdminDestinations from '../../src/pages/admin/AdminDestinations';

const endpoint = {
  id: 'ep-1',
  url: 'https://example.com/webhook',
  secret: 's3cret',
  is_active: true,
  event_types: ['donation.created'],
  verify_ssl: true,
  description: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  destination_type: 'HTTP',
  amqp_url: null,
  amqp_exchange: '',
  amqp_routing_key: null,
};

describe('AdminDestinations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the list of destinations from the (already-unwrapped) API result', async () => {
    // getDestinations() returns the endpoint array directly (not { data }),
    // mirroring the api/admin.ts helper contract.
    mocks.getDestinations.mockResolvedValue([endpoint]);

    render(
      <MemoryRouter>
        <AdminDestinations />
      </MemoryRouter>,
    );

    expect(await screen.findByText('webhooks')).toBeInTheDocument();
    expect(await screen.findByText('donation.created')).toBeInTheDocument();
  });

  it('shows the empty state when no destinations exist', async () => {
    mocks.getDestinations.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminDestinations />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No webhook endpoints configured/)).toBeInTheDocument();
  });
});
