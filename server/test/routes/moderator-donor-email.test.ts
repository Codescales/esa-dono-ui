import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

/**
 * Static regression guard for the donor-email leak documented at the top of
 * server/routes/moderator.ts (fixed in 87ad5e4, then again for the donations
 * endpoints). Behavioral tests only cover the specific endpoints someone
 * remembered to assert on — this scans the whole file so a `donor: { select:
 * { email: ... } } }` (or equivalent) added to *any* moderator handler fails
 * CI immediately, regardless of which route it's added to.
 *
 * If this test fails, you almost certainly added donor.email to a moderator
 * response. Use `donor_name` (a plain column, no join needed) instead — do
 * not weaken this test to make a change pass.
 */
describe('moderator routes never select/include donor.email', () => {
  it('has no donor.select.email pattern anywhere in moderator.ts code (comments excluded)', () => {
    const path = fileURLToPath(new URL('../../routes/moderator.ts', import.meta.url));
    const source = readFileSync(path, 'utf-8');

    // Strip `//` line comments so this test can document the forbidden
    // pattern in prose without triggering on itself.
    const code = source
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');

    const donorEmailSelect = /donor:\s*{\s*select:\s*{\s*email\b/;
    expect(code).not.toMatch(donorEmailSelect);
  });
});
