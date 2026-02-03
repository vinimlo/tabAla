/**
 * Unit tests for CreateCollectionModal component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import CreateCollectionModal from '@/popup/components/CreateCollectionModal.svelte';

function getInput(): HTMLInputElement {
  return screen.getByPlaceholderText<HTMLInputElement>('Nome da coleção');
}

async function typeText(input: HTMLInputElement, text: string): Promise<void> {
  input.value = text;
  await fireEvent.input(input, { target: { value: text } });
}

describe('CreateCollectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(CreateCollectionModal);
      expect(screen.getByText('Nova Coleção')).toBeInTheDocument();
    });

    it('should render input field with placeholder', () => {
      render(CreateCollectionModal);
      expect(screen.getByPlaceholderText('Nome da coleção')).toBeInTheDocument();
    });

    it('should render Cancelar button', () => {
      render(CreateCollectionModal);
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('should render Criar button', () => {
      render(CreateCollectionModal);
      expect(screen.getByText('Criar')).toBeInTheDocument();
    });

    it('should show character count', () => {
      render(CreateCollectionModal);
      expect(screen.getByText('0/100')).toBeInTheDocument();
    });
  });

  describe('input behavior', () => {
    it('should accept text input', async () => {
      render(CreateCollectionModal);
      const input = getInput();

      await typeText(input, 'Minha Coleção');

      expect(input.value).toBe('Minha Coleção');
    });

    it('should update character count as user types', async () => {
      render(CreateCollectionModal);
      const input = getInput();

      await typeText(input, 'Test');

      expect(screen.getByText('4/100')).toBeInTheDocument();
    });

    it('should have focusable input element', () => {
      render(CreateCollectionModal);
      const input = screen.getByPlaceholderText('Nome da coleção');
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });
  });

  describe('validation', () => {
    it('should show error for duplicate name', async () => {
      render(CreateCollectionModal, { props: { existingNames: ['Trabalho'] } });
      const input = getInput();

      await typeText(input, 'Trabalho');

      await waitFor(() => {
        expect(screen.getByText('Já existe uma coleção com este nome')).toBeInTheDocument();
      });
    });

    it('should detect case-insensitive duplicates', async () => {
      render(CreateCollectionModal, { props: { existingNames: ['Trabalho'] } });
      const input = getInput();

      await typeText(input, 'trabalho');

      await waitFor(() => {
        expect(screen.getByText('Já existe uma coleção com este nome')).toBeInTheDocument();
      });
    });

    it('should clear error when name becomes valid', async () => {
      render(CreateCollectionModal, { props: { existingNames: ['Trabalho'] } });
      const input = getInput();

      await typeText(input, 'Trabalho');
      await waitFor(() => {
        expect(screen.getByText('Já existe uma coleção com este nome')).toBeInTheDocument();
      });

      await typeText(input, 'Estudos');

      await waitFor(() => {
        expect(screen.queryByText('Já existe uma coleção com este nome')).not.toBeInTheDocument();
      });
    });
  });

  describe('button states', () => {
    it('should disable Criar button when input is empty', () => {
      render(CreateCollectionModal);
      const submitBtn = screen.getByText('Criar');

      expect(submitBtn).toBeDisabled();
    });

    it('should enable Criar button when input has valid text', async () => {
      render(CreateCollectionModal);
      const input = getInput();
      const submitBtn = screen.getByText('Criar');

      await typeText(input, 'Valid Name');

      expect(submitBtn).not.toBeDisabled();
    });

    it('should disable Criar button when validation fails', async () => {
      render(CreateCollectionModal, { props: { existingNames: ['Existente'] } });
      const input = getInput();
      const submitBtn = screen.getByText('Criar');

      await typeText(input, 'Existente');

      expect(submitBtn).toBeDisabled();
    });
  });

  describe('events', () => {
    it('should dispatch create event with trimmed name on submit', async () => {
      const { component } = render(CreateCollectionModal);
      const createHandler = vi.fn();
      component.$on('create', createHandler);

      const input = getInput();
      await typeText(input, '  Nova Coleção  ');

      const submitBtn = screen.getByText('Criar');
      await fireEvent.click(submitBtn);

      expect(createHandler).toHaveBeenCalledWith(
        expect.objectContaining({ detail: 'Nova Coleção' })
      );
    });

    it('should dispatch cancel event when Cancelar is clicked', async () => {
      const { component } = render(CreateCollectionModal);
      const cancelHandler = vi.fn();
      component.$on('cancel', cancelHandler);

      const cancelBtn = screen.getByText('Cancelar');
      await fireEvent.click(cancelBtn);

      expect(cancelHandler).toHaveBeenCalled();
    });

    it('should dispatch cancel event when backdrop is clicked', async () => {
      const { component } = render(CreateCollectionModal);
      const cancelHandler = vi.fn();
      component.$on('cancel', cancelHandler);

      const backdrop = document.querySelector('.backdrop');
      if (backdrop) {
        await fireEvent.click(backdrop);
      }

      expect(cancelHandler).toHaveBeenCalled();
    });

    it('should dispatch cancel event when ESC key is pressed', async () => {
      const { component } = render(CreateCollectionModal);
      const cancelHandler = vi.fn();
      component.$on('cancel', cancelHandler);

      const backdrop = document.querySelector('.backdrop');
      if (backdrop) {
        await fireEvent.keyDown(backdrop, { key: 'Escape' });
      }

      expect(cancelHandler).toHaveBeenCalled();
    });

    it('should dispatch create event when form is submitted', async () => {
      const { component } = render(CreateCollectionModal);
      const createHandler = vi.fn();
      component.$on('create', createHandler);

      const input = getInput();
      await typeText(input, 'Test Collection');

      const form = document.querySelector('form');
      if (form) {
        await fireEvent.submit(form);
      }

      expect(createHandler).toHaveBeenCalled();
    });

    it('should not dispatch create event when form submitted with invalid input', async () => {
      const { component } = render(CreateCollectionModal, {
        props: { existingNames: ['Existente'] },
      });
      const createHandler = vi.fn();
      component.$on('create', createHandler);

      const input = getInput();
      await typeText(input, 'Existente');

      const form = document.querySelector('form');
      if (form) {
        await fireEvent.submit(form);
      }

      expect(createHandler).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when submitting', async () => {
      const { component } = render(CreateCollectionModal);
      component.$on('create', () => {});

      const input = getInput();
      await typeText(input, 'Test');

      const submitBtn = screen.getByText('Criar');
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Criando...')).toBeInTheDocument();
    });

    it('should disable buttons while submitting', async () => {
      const { component } = render(CreateCollectionModal);
      component.$on('create', () => {});

      const input = getInput();
      await typeText(input, 'Test');

      const submitBtn = screen.getByText('Criar');
      await fireEvent.click(submitBtn);

      expect(screen.getByText('Cancelar')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should have proper role attribute', () => {
      render(CreateCollectionModal);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute on backdrop', () => {
      render(CreateCollectionModal);
      const backdrop = document.querySelector('[aria-modal="true"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('should have aria-labelledby on backdrop', () => {
      render(CreateCollectionModal);
      const backdrop = document.querySelector('[aria-labelledby="modal-title"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('should set aria-invalid when validation fails', async () => {
      render(CreateCollectionModal, { props: { existingNames: ['Test'] } });
      const input = getInput();

      await typeText(input, 'Test');

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
