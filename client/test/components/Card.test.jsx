import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../../src/components/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello World</Card>);
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('applies default classes', () => {
    const { container } = render(<Card>Test</Card>);
    const div = container.firstChild;
    expect(div.className).toContain('esa-panel');
    expect(div.className).toContain('rounded-lg');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-class">Test</Card>);
    const div = container.firstChild;
    expect(div.className).toContain('custom-class');
    expect(div.className).toContain('esa-panel');
  });
});
