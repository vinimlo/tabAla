/**
 * LinkItem component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LinkItem from '@/popup/components/LinkItem.svelte';
import type { Link } from '@/lib/types';

const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'test-link-1',
  url: 'https://example.com/page',
  title: 'Example Page',
  collectionId: 'inbox',
  createdAt: Date.now(),
  ...overrides,
});

describe('LinkItem Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.tabs.create).mockResolvedValue({ id: 1, url: '' } as chrome.tabs.Tab);
  });

  it('should render link title and URL', () => {
    const link = createMockLink({ title: 'Test Title', url: 'https://test.com/path' });
    render(LinkItem, { props: { link } });

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('test.com/path')).toBeInTheDocument();
  });

  it('should show "Untitled" for links without title', () => {
    const link = createMockLink({ title: '' });
    render(LinkItem, { props: { link } });

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('should have accessible open button', () => {
    const link = createMockLink({ title: 'My Link' });
    render(LinkItem, { props: { link } });

    const openButton = screen.getByRole('button', { name: /abrir my link em nova aba/i });
    expect(openButton).toBeInTheDocument();
  });

  it('should call chrome.tabs.create when link content is clicked', async () => {
    const link = createMockLink({ url: 'https://test.com' });
    render(LinkItem, { props: { link } });

    const openButton = screen.getByRole('button', { name: /abrir/i });
    await fireEvent.click(openButton);

    await waitFor(() => {
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://test.com',
        active: true,
      });
    });
  });

  it('should show spinner while loading', async () => {
    let resolveCreate!: (value: chrome.tabs.Tab) => void;
    vi.mocked(chrome.tabs.create).mockReturnValue(
      new Promise<chrome.tabs.Tab>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const link = createMockLink();
    const { container } = render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(container.querySelector('.open-spinner')).toBeInTheDocument();
    });

    resolveCreate({ id: 1, url: '' } as chrome.tabs.Tab);

    await waitFor(() => {
      expect(container.querySelector('.open-spinner')).not.toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    let resolveCreate!: (value: chrome.tabs.Tab) => void;
    vi.mocked(chrome.tabs.create).mockReturnValue(
      new Promise<chrome.tabs.Tab>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    const link = createMockLink();
    render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    resolveCreate({ id: 1, url: '' } as chrome.tabs.Tab);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('should dispatch error event for invalid URL', async () => {
    const link = createMockLink({ url: 'invalid-url' });
    const handleError = vi.fn();

    const { component } = render(LinkItem, { props: { link } });
    component.$on('error', handleError);

    const button = screen.getByRole('button', { name: /abrir/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
      expect(handleError.mock.calls[0][0].detail.message).toBe(
        'URL inválido. Não foi possível abrir o link.',
      );
    });
  });

  it('should dispatch error event when chrome.tabs.create fails', async () => {
    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(new Error('Failed'));

    const link = createMockLink({ url: 'https://example.com' });
    const handleError = vi.fn();

    const { component } = render(LinkItem, { props: { link } });
    component.$on('error', handleError);

    const button = screen.getByRole('button', { name: /abrir/i });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled();
      expect(handleError.mock.calls[0][0].detail.message).toBe(
        'Erro ao abrir link. Tente novamente.',
      );
    });
  });

  it('should dispatch remove event when remove button is clicked', async () => {
    const link = createMockLink({ id: 'link-to-remove' });
    const { component } = render(LinkItem, { props: { link } });

    const handleRemove = vi.fn();
    component.$on('remove', handleRemove);

    const container = screen.getByRole('listitem');
    await fireEvent.mouseEnter(container);

    const removeButton = screen.getByRole('button', { name: /remover link/i });
    await fireEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { linkId: 'link-to-remove' },
      }),
    );
  });

  it('should show remove button on hover', async () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    expect(screen.queryByRole('button', { name: /remover link/i })).not.toBeInTheDocument();

    const container = screen.getByRole('listitem');
    await fireEvent.mouseEnter(container);

    expect(screen.getByRole('button', { name: /remover link/i })).toBeInTheDocument();
  });

  it('should truncate long URLs', () => {
    const longUrl = 'https://example.com/very/long/path/that/should/be/truncated/to/fit';
    const link = createMockLink({ url: longUrl });
    render(LinkItem, { props: { link } });

    const urlElement = screen.getByText(/example\.com\/very\/long/);
    expect(urlElement).toBeInTheDocument();
  });

  it('should render with proper role for accessibility', () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    const link = createMockLink();
    render(LinkItem, { props: { link } });

    const button = screen.getByRole('button', { name: /abrir/i });
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });
});
