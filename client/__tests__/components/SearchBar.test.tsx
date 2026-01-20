import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../../src/components/SearchBar';

describe('SearchBar', () => {
  describe('rendering', () => {
    it('should render input field and search button', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(
        screen.getByPlaceholderText('Search files and folders...')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    it('should render help button', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(
        screen.getByRole('button', { name: 'Toggle search help' })
      ).toBeInTheDocument();
    });

    it('should render with initial query', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} initialQuery="test query" />);

      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} isLoading={true} />);

      expect(
        screen.getByRole('button', { name: 'Search' })
      ).toHaveTextContent('Searching...');
      expect(
        screen.getByPlaceholderText('Search files and folders...')
      ).toBeDisabled();
    });
  });

  describe('search submission', () => {
    it('should call onSearch when form is submitted with valid query', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation photos');
      await user.click(screen.getByRole('button', { name: 'Search' }));

      expect(onSearch).toHaveBeenCalledWith('vacation photos');
    });

    it('should call onSearch when pressing Enter', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation photos{enter}');

      expect(onSearch).toHaveBeenCalledWith('vacation photos');
    });

    it('should trim whitespace from query', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, '  vacation photos  ');
      await user.click(screen.getByRole('button', { name: 'Search' }));

      expect(onSearch).toHaveBeenCalledWith('vacation photos');
    });

    it('should not call onSearch with empty query', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, '   ');
      await user.click(screen.getByRole('button', { name: 'Search' }));

      expect(onSearch).not.toHaveBeenCalled();
    });

    it('should disable search button when query is empty', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    });

    it('should disable search button when loading', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} isLoading={true} initialQuery="test" />);

      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
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
      // Check that code examples are shown
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
      await user.click(screen.getByRole('button', { name: 'Search' }));

      expect(onSearch).toHaveBeenCalledWith('"exact phrase" other terms');
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

    it('should have accessible search button', () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      expect(
        screen.getByRole('button', { name: 'Search' })
      ).toBeInTheDocument();
    });
  });
});
