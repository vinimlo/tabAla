import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { chromeMock } from '../setup';
import TabsCountHarness from './TabsCountHarness.svelte';

const tab = (id: number): chrome.tabs.Tab =>
  ({ id, url: `https://example.com/${id}`, title: `Tab ${id}`, active: false, pinned: false, index: id, windowId: 1 }) as chrome.tabs.Tab;

describe('TabsSidebar', () => {
  it('counts the open tabs even while closed, and shows nothing then', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([tab(1), tab(2)]);
    render(TabsCountHarness, { props: { expanded: false } });

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    expect(screen.queryByText('tabs_sidebar_title')).toBeNull();
    expect(screen.queryByRole('button', { name: 'tabs_sidebar_open' })).toBeNull();
  });

  it('lists the tabs when open', async () => {
    chromeMock.tabs.query.mockResolvedValueOnce([tab(1)]);
    render(TabsCountHarness, { props: { expanded: true } });

    expect(await screen.findByText('Tab 1')).toBeInTheDocument();
  });
});
