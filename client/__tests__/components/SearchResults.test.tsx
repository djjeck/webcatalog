import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResults } from '../../src/components/SearchResults';
import type { SearchResultItem } from '../../src/types/api';

describe('SearchResults', () => {
  const mockResults: SearchResultItem[] = [
    {
      id: 1,
      name: 'vacation-photo.jpg',
      path: '/Photos/Summer/vacation-photo.jpg',
      size: 2048576,
      dateModified: '2024-06-15T10:30:00Z',
      dateCreated: '2024-06-15T10:00:00Z',
      type: 'file',
      volumeName: 'Backup Drive',
    },
    {
      id: 2,
      name: 'vacation-video.mp4',
      path: '/Videos/Summer/vacation-video.mp4',
      size: 104857600,
      dateModified: '2024-06-15T11:30:00Z',
      dateCreated: '2024-06-15T11:00:00Z',
      type: 'file',
      volumeName: 'Backup Drive',
    },
  ];

  describe('empty state', () => {
    it('should show no results message when results array is empty', () => {
      render(
        <SearchResults
          results={[]}
          query="test query"
          totalResults={0}
          executionTime={50}
        />
      );

      expect(screen.getByText(/No results found for/)).toBeInTheDocument();
      expect(screen.getByText('test query')).toBeInTheDocument();
    });

    it('should show helpful hint in empty state', () => {
      render(
        <SearchResults
          results={[]}
          query="test"
          totalResults={0}
          executionTime={50}
        />
      );

      expect(
        screen.getByText(/Try different search terms or use quotes/)
      ).toBeInTheDocument();
    });
  });

  describe('results display', () => {
    it('should display result count', () => {
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={2}
          executionTime={50}
        />
      );

      expect(screen.getByText('2 results found')).toBeInTheDocument();
    });

    it('should display singular "result" for single result', () => {
      render(
        <SearchResults
          results={[mockResults[0]]}
          query="vacation"
          totalResults={1}
          executionTime={50}
        />
      );

      expect(screen.getByText('1 result found')).toBeInTheDocument();
    });

    it('should display execution time', () => {
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={2}
          executionTime={123}
        />
      );

      expect(screen.getByText('(123ms)')).toBeInTheDocument();
    });

    it('should round execution time', () => {
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={2}
          executionTime={123.456}
        />
      );

      expect(screen.getByText('(123ms)')).toBeInTheDocument();
    });

    it('should render all result items', () => {
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={2}
          executionTime={50}
        />
      );

      expect(screen.getByText('vacation-photo.jpg')).toBeInTheDocument();
      expect(screen.getByText('vacation-video.mp4')).toBeInTheDocument();
    });

    it('should pass search terms to ResultItem for highlighting', () => {
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={2}
          executionTime={50}
          searchTerms={['vacation']}
        />
      );

      // Check that result items are rendered with highlighting
      const highlights = screen.getAllByText('vacation');
      expect(highlights.length).toBeGreaterThan(0);
    });
  });

  describe('result count vs displayed results', () => {
    it('should show total results count even if displaying fewer', () => {
      // This could happen with pagination
      render(
        <SearchResults
          results={[mockResults[0]]}
          query="vacation"
          totalResults={100}
          executionTime={50}
        />
      );

      expect(screen.getByText('100 results found')).toBeInTheDocument();
      // But only one ResultItem is rendered
      expect(screen.getAllByTestId('result-item')).toHaveLength(1);
    });
  });

  describe('load more', () => {
    it('should show load more button when hasMore is true and onLoadMore is provided', () => {
      const onLoadMore = vi.fn();
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={100}
          executionTime={50}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      expect(screen.getByRole('button', { name: /Load more/ })).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      const onLoadMore = vi.fn();
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={2}
          executionTime={50}
          hasMore={false}
          onLoadMore={onLoadMore}
        />
      );

      expect(screen.queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument();
    });

    it('should not show load more button when onLoadMore is not provided', () => {
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={100}
          executionTime={50}
          hasMore={true}
        />
      );

      expect(screen.queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument();
    });

    it('should display current count and total in load more button', () => {
      const onLoadMore = vi.fn();
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={100}
          executionTime={50}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      expect(screen.getByRole('button', { name: 'Load more (2 of 100)' })).toBeInTheDocument();
    });

    it('should call onLoadMore when button is clicked', async () => {
      const user = userEvent.setup();
      const onLoadMore = vi.fn();
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={100}
          executionTime={50}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      await user.click(screen.getByRole('button', { name: /Load more/ }));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should show loading state and disable button when isLoadingMore is true', () => {
      const onLoadMore = vi.fn();
      render(
        <SearchResults
          results={mockResults}
          query="vacation"
          totalResults={100}
          executionTime={50}
          hasMore={true}
          isLoadingMore={true}
          onLoadMore={onLoadMore}
        />
      );

      const button = screen.getByRole('button', { name: 'Loading...' });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });
});
