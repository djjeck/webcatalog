import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../../src/components/SearchBar';

describe('SearchBar', () => {
  describe('rendering', () => {
    it('should render input field and help button', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(
        screen.getByPlaceholderText('Search files and folders...')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Toggle search help' })
      ).toBeInTheDocument();
    });

    it('should render with initial query', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} initialQuery="test query" />);

      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });
  });

  describe('live search with debounce', () => {
    it('should call onSearch after debounce delay when typing', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'test');

      // Wait for debounce to complete
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('test');
      }, { timeout: 500 });

      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid keystrokes', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vac');

      // Wait for debounce
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalled();
      }, { timeout: 500 });

      // Should only be called once with final value
      expect(onSearch).toHaveBeenCalledWith('vac');
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from query', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, '  test  ');

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('test');
      }, { timeout: 500 });
    });

    it('should call onClear when input is cleared', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const onClear = vi.fn();
      render(<SearchBar onSearch={onSearch} onClear={onClear} initialQuery="test" />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.clear(input);

      // onClear should be called immediately (no debounce for clearing)
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onSearch).not.toHaveBeenCalled();
    });

    it('should call onClear when input becomes whitespace only', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const onClear = vi.fn();
      render(<SearchBar onSearch={onSearch} onClear={onClear} initialQuery="test" />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.clear(input);
      await user.type(input, '   ');

      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('search help', () => {
    it('should not show help by default', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(screen.queryByText('Search Syntax')).not.toBeInTheDocument();
    });

    it('should toggle help when help button is clicked', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const helpButton = screen.getByRole('button', {
        name: 'Toggle search help',
      });

      // Show help
      await user.click(helpButton);
      expect(screen.getByText('Search Syntax')).toBeInTheDocument();
      expect(helpButton).toHaveAttribute('aria-expanded', 'true');

      // Hide help
      await user.click(helpButton);
      expect(screen.queryByText('Search Syntax')).not.toBeInTheDocument();
      expect(helpButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show search syntax examples when help is visible', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      await user.click(
        screen.getByRole('button', { name: 'Toggle search help' })
      );

      expect(screen.getByText('Search Syntax')).toBeInTheDocument();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('quoted phrase handling', () => {
    it('should preserve quoted phrases in query', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, '"exact phrase" other terms');

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('"exact phrase" other terms');
      }, { timeout: 500 });
    });
  });

  describe('accessibility', () => {
    it('should have accessible input label', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(
        screen.getByRole('textbox', { name: 'Search query' })
      ).toBeInTheDocument();
    });
  });

  describe('autofocus', () => {
    it('should focus input on mount', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      expect(input).toHaveFocus();
    });
  });

  describe('escape key', () => {
    it('should clear input and call onClear when pressing Escape', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const onClear = vi.fn();
      render(<SearchBar onSearch={onSearch} onClear={onClear} initialQuery="test" />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.click(input);
      await user.keyboard('{Escape}');

      expect(input).toHaveValue('');
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('should clear input without error when onClear is not provided', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} initialQuery="test" />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.click(input);
      await user.keyboard('{Escape}');

      expect(input).toHaveValue('');
    });
  });
});
