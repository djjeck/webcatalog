import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../../src/components/EmptyState';

describe('EmptyState', () => {
  describe('initial state', () => {
    it('should show search prompt', () => {
      render(<EmptyState type="initial" />);

      expect(screen.getByText('Search Your Catalog')).toBeInTheDocument();
    });

    it('should show helpful message', () => {
      render(<EmptyState type="initial" />);

      expect(
        screen.getByText(/Enter a search term above/)
      ).toBeInTheDocument();
    });

    it('should show search tips', () => {
      render(<EmptyState type="initial" />);

      expect(screen.getByText(/Use quotes for exact phrases/)).toBeInTheDocument();
      expect(screen.getByText(/Multiple words are combined with AND/)).toBeInTheDocument();
    });

    it('should have search icon', () => {
      render(<EmptyState type="initial" />);

      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should have status role', () => {
      render(<EmptyState type="initial" />);

      expect(screen.getByRole('status')).toHaveClass('empty-state-initial');
    });
  });

  describe('no-results state', () => {
    it('should show no results title', () => {
      render(<EmptyState type="no-results" />);

      expect(screen.getByText('No Results Found')).toBeInTheDocument();
    });

    it('should show query in message when provided', () => {
      render(<EmptyState type="no-results" query="vacation photos" />);

      // Query is wrapped in strong tag
      expect(screen.getByText('vacation photos')).toBeInTheDocument();
      expect(screen.getByText('vacation photos').tagName).toBe('STRONG');
    });

    it('should show generic message when no query provided', () => {
      render(<EmptyState type="no-results" />);

      expect(screen.getByText(/your search/)).toBeInTheDocument();
    });

    it('should show suggestions', () => {
      render(<EmptyState type="no-results" />);

      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
      expect(screen.getByText('Check your spelling')).toBeInTheDocument();
      expect(screen.getByText('Try different keywords')).toBeInTheDocument();
    });

    it('should have mailbox icon', () => {
      render(<EmptyState type="no-results" />);

      expect(screen.getByText('📭')).toBeInTheDocument();
    });

    it('should have status role', () => {
      render(<EmptyState type="no-results" />);

      expect(screen.getByRole('status')).toHaveClass('empty-state-no-results');
    });
  });

  describe('error state', () => {
    it('should show error title', () => {
      render(<EmptyState type="error" />);

      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });

    it('should show custom error message when provided', () => {
      render(
        <EmptyState type="error" errorMessage="Database connection failed" />
      );

      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    it('should show default error message when not provided', () => {
      render(<EmptyState type="error" />);

      expect(
        screen.getByText(/An error occurred while searching/)
      ).toBeInTheDocument();
    });

    it('should show recovery suggestions', () => {
      render(<EmptyState type="error" />);

      expect(screen.getByText('Refreshing the page')).toBeInTheDocument();
      expect(screen.getByText('Checking your network connection')).toBeInTheDocument();
    });

    it('should have warning icon', () => {
      render(<EmptyState type="error" />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should have alert role', () => {
      render(<EmptyState type="error" />);

      expect(screen.getByRole('alert')).toHaveClass('empty-state-error');
    });
  });

  describe('unknown type', () => {
    it('should return null for unknown type', () => {
      // @ts-expect-error - Testing invalid type
      const { container } = render(<EmptyState type="unknown" />);

      expect(container.firstChild).toBeNull();
    });
  });
});
