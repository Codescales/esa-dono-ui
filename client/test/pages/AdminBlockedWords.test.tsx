import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const adminClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/api/admin', () => ({ default: adminClient }));

import AdminBlockedWords from '../../src/pages/admin/AdminBlockedWords';

describe('AdminBlockedWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists blocked words', async () => {
    adminClient.get.mockResolvedValue({ data: [{ id: 'w1', word: 'spam' }] });

    render(<AdminBlockedWords />);

    expect(await screen.findByText('spam')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    adminClient.get.mockResolvedValue({ data: [] });

    render(<AdminBlockedWords />);

    expect(await screen.findByText(/No blocked words yet/)).toBeInTheDocument();
  });
});
