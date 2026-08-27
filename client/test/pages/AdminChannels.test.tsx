import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const adminClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/api/admin', () => ({ default: adminClient }));

import AdminChannels from '../../src/pages/admin/AdminChannels';

describe('AdminChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists channels', async () => {
    adminClient.get.mockResolvedValue({ data: [{ id: 'c1', name: 'Main', is_active: true }] });

    render(<AdminChannels />);

    expect(await screen.findByText('Main')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    adminClient.get.mockResolvedValue({ data: [] });

    render(<AdminChannels />);

    expect(await screen.findByText(/No channels yet/)).toBeInTheDocument();
  });
});
