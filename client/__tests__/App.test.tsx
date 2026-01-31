import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import * as api from '../src/services/api';
import type { SearchResponse, DbStatusResponse } from '../src/types/api';

// Mock the API module
vi.mock('../src/services/api', () => ({
  search: vi.fn(),
  getDbStatus: vi.fn(),
  ApiError: class ApiError extends Error {
    statusCode: number;
    errorType: string;
    constructor(statusCode: number, errorType: string, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.errorType = errorType;
    }
  },
}));

const mockSearch = vi.mocked(api.search);
const mockGetDbStatus = vi.mocked(api.getDbStatus);

describe('App', () => {
  const mockDbStatus: DbStatusResponse = {
    connected: true,
    path: '/data/catalog.w3cat',
    fileSize: 1073741824,
    lastModified: '2024-06-15T10:30:00Z',
    lastLoaded: new Date().toISOString(),
    statistics: {
      totalItems: 15000,
      totalFiles: 12000,
      totalFolders: 2500,
      totalVolumes: 5,
      totalSize: 5368709120000,
    },
  };

  const mockSearchResponse: SearchResponse = {
    query: 'vacation',
    results: [
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
    ],
    totalResults: 2,
    executionTime: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDbStatus.mockResolvedValue(mockDbStatus);
  });

  describe('initial render', () => {
    it('should render app layout with title and components', async () => {
      render(<App />);

      // App-specific layout elements
      expect(screen.getByText('WebCatalog')).toBeInTheDocument();
      expect(screen.getByText('Search your file catalog')).toBeInTheDocument();
      // Verify components are composed (detailed rendering tested in component unit tests)
      expect(screen.getByPlaceholderText('Search files and folders...')).toBeInTheDocument();
      expect(screen.getByText('Search Your Catalog')).toBeInTheDocument();
    });

    it('should fetch and display database status on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      expect(mockGetDbStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('search flow', () => {
    it('should show loading state when searching', async () => {
      // Make search hang to capture loading state
      mockSearch.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      render(<App />);

      // Wait for db status to load first
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      // Wait for debounce and check for loading indicator
      await waitFor(() => {
        expect(document.querySelector('.loading-state')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should call search API and display results', async () => {
      mockSearch.mockResolvedValue(mockSearchResponse);

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation photos');

      // Wait for debounce and API call
      await waitFor(() => {
        expect(mockSearch) .toHaveBeenCalledWith(expect.objectContaining({ query: 'vacation photos', limit: 50 }));
      }, { timeout: 500 });

      // Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText('2 results found')).toBeInTheDocument();
      });
    });

    it('should transition to no-results state when search returns empty', async () => {
      mockSearch.mockResolvedValue({
        query: 'nonexistent',
        results: [],
        totalResults: 0,
        executionTime: 10,
      });

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No Results Found')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should clear results when input is emptied', async () => {
      mockSearch.mockResolvedValue(mockSearchResponse);

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      await waitFor(() => {
        expect(screen.getByText('2 results found')).toBeInTheDocument();
      }, { timeout: 500 });

      // Clear the input
      await user.clear(input);

      // Should return to initial state
      await waitFor(() => {
        expect(screen.getByText('Search Your Catalog')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state when search fails', async () => {
      mockSearch.mockRejectedValue(
        new api.ApiError(500, 'Internal Error', 'Database connection failed')
      );

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      }, { timeout: 500 });

      expect(
        screen.getByText('Database connection failed')
      ).toBeInTheDocument();
    });

    it('should show generic error message for non-API errors', async () => {
      mockSearch.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      }, { timeout: 500 });

      expect(
        screen.getByText('An error occurred while searching')
      ).toBeInTheDocument();
    });

    it('should show error in status bar when db status fails', async () => {
      mockGetDbStatus.mockRejectedValue(
        new api.ApiError(500, 'Internal Error', 'Cannot connect to database')
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Cannot connect to database')
      ).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('should transition from initial to results state', async () => {
      mockSearch.mockResolvedValue(mockSearchResponse);

      const user = userEvent.setup();
      render(<App />);

      // Initial state
      expect(screen.getByText('Search Your Catalog')).toBeInTheDocument();

      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      // Results state replaces initial state
      await waitFor(() => {
        expect(screen.getByText('2 results found')).toBeInTheDocument();
      }, { timeout: 500 });

      expect(
        screen.queryByText('Search Your Catalog')
      ).not.toBeInTheDocument();
    });

    it('should allow searching again after results', async () => {
      mockSearch
        .mockResolvedValueOnce(mockSearchResponse)
        .mockResolvedValueOnce({
          query: 'photos',
          results: [mockSearchResponse.results[0]],
          totalResults: 1,
          executionTime: 20,
        });

      const user = userEvent.setup();
      render(<App />);

      // First search
      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      await waitFor(() => {
        expect(screen.getByText('2 results found')).toBeInTheDocument();
      }, { timeout: 500 });

      // Second search
      await user.clear(input);
      await user.type(input, 'photos');

      await waitFor(() => {
        expect(screen.getByText('1 result found')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should allow searching again after error', async () => {
      mockSearch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSearchResponse);

      const user = userEvent.setup();
      render(<App />);

      // First search fails
      const input = screen.getByPlaceholderText('Search files and folders...');
      await user.type(input, 'vacation');

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      }, { timeout: 500 });

      // Second search succeeds
      await user.clear(input);
      await user.type(input, 'vacation');

      await waitFor(() => {
        expect(screen.getByText('2 results found')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});
