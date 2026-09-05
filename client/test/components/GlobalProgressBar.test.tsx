import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalProgressBar from '../../src/components/GlobalProgressBar';
import { CampaignProvider } from '../../src/context/CampaignContext';

vi.mock('../../src/api/campaign', () => ({
  getCampaign: vi.fn(),
}));

import { getCampaign } from '../../src/api/campaign';

function renderGlobalProgressBar() {
  return render(
    <CampaignProvider>
      <GlobalProgressBar />
    </CampaignProvider>,
  );
}

describe('GlobalProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing initially when campaign is not loaded', () => {
    vi.mocked(getCampaign).mockReturnValue(new Promise(() => {}));
    const { container } = renderGlobalProgressBar();
    expect(container.firstChild).toBeNull();
  });

  it('renders campaign progress bar when campaign is loaded', async () => {
    vi.mocked(getCampaign).mockResolvedValue({
      name: 'Summer Marathon',
      amount_raised: { value: '2500.00' },
      goal: { value: '10000.00' },
    });

    renderGlobalProgressBar();

    expect(await screen.findByTestId('global-progress-bar')).toBeDefined();
    expect(screen.getByText('Campaign Progress')).toBeDefined();
    expect(screen.getByText('$2,500 / $10,000 (25%)')).toBeDefined();
  });
});
