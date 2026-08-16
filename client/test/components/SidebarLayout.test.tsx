import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SidebarLayout, { type SidebarNavItem } from '../../src/components/SidebarLayout';

function DummyIcon(props: { className?: string }) {
  return <svg data-testid="dummy-icon" className={props.className} />;
}

const NAV: SidebarNavItem[] = [
  { to: '/', label: 'dashboard', end: true, icon: DummyIcon },
  { to: '/other', label: 'other page', icon: DummyIcon },
];

function renderLayout(storageKey = 'test_sidebar_collapsed') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SidebarLayout title="admin" nav={NAV} storageKey={storageKey} />}>
          <Route index element={<div>content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderExpandedLayout(storageKey: string) {
  // The component defaults to collapsed unless localStorage explicitly says
  // '0' — set that up front so these tests exercise the expanded state.
  localStorage.setItem(storageKey, '0');
  return renderLayout(storageKey);
}

describe('SidebarLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is collapsed by default (no stored preference)', () => {
    renderLayout();
    expect(screen.queryByText('dashboard')).toBeNull();
    expect(screen.queryByText('other page')).toBeNull();
    expect(screen.getByTitle('expand')).toBeDefined();
    expect(screen.getAllByTestId('dummy-icon').length).toBeGreaterThanOrEqual(2);
  });

  it('renders nav labels and title when explicitly expanded via storage', () => {
    renderExpandedLayout('expanded_key');
    expect(screen.getByText('admin')).toBeDefined();
    expect(screen.getByText('dashboard')).toBeDefined();
    expect(screen.getByText('other page')).toBeDefined();
    expect(screen.getByTitle('collapse')).toBeDefined();
  });

  it('collapses on toggle click, hiding labels but keeping icons', () => {
    renderExpandedLayout('collapse_toggle_key');
    fireEvent.click(screen.getByTitle('collapse'));

    expect(screen.queryByText('dashboard')).toBeNull();
    expect(screen.queryByText('other page')).toBeNull();
    expect(screen.getAllByTestId('dummy-icon').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTitle('expand')).toBeDefined();
  });

  it('expands on toggle click when starting collapsed', () => {
    renderLayout('expand_toggle_key');
    fireEvent.click(screen.getByTitle('expand'));

    expect(screen.getByText('dashboard')).toBeDefined();
    expect(screen.getByText('other page')).toBeDefined();
    expect(screen.getByTitle('collapse')).toBeDefined();
  });

  it('persists collapsed state to localStorage under the given key', () => {
    renderExpandedLayout('my_storage_key');
    fireEvent.click(screen.getByTitle('collapse'));
    expect(localStorage.getItem('my_storage_key')).toBe('1');
  });

  it('restores collapsed state from localStorage on mount', () => {
    localStorage.setItem('my_storage_key', '1');
    renderLayout('my_storage_key');
    expect(screen.queryByText('dashboard')).toBeNull();
    expect(screen.getByTitle('expand')).toBeDefined();
  });

  it('renders the collapse-aware footer', () => {
    const storageKey = 'footer_test_key';
    localStorage.setItem(storageKey, '0');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <SidebarLayout
                title="admin"
                nav={NAV}
                storageKey={storageKey}
                footer={(collapsed) => <div>footer-{collapsed ? 'collapsed' : 'expanded'}</div>}
              />
            }
          >
            <Route index element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('footer-expanded')).toBeDefined();
    fireEvent.click(screen.getByTitle('collapse'));
    expect(screen.getByText('footer-collapsed')).toBeDefined();
  });
});
