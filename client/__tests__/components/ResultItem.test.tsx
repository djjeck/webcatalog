import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultItem } from '../../src/components/ResultItem';
import {
  formatFileSize,
  formatDate,
  highlightTerms,
} from '../../src/utils/format';
import type { SearchResultItem } from '../../src/types/api';

// Global mock for clipboard
const mockWriteText = vi.fn();

describe('ResultItem', () => {
  const mockFileItem: SearchResultItem = {
    id: 1,
    name: 'vacation-photo.jpg',
    path: '/Photos/Summer/vacation-photo.jpg',
    size: 2048576,
    dateModified: '2024-06-15T10:30:00Z',
    dateCreated: '2024-06-15T10:00:00Z',
    type: 'file',
    volumeLabel: 'Backup Drive',
    volumePath: 'D:',
  };

  const mockFolderItem: SearchResultItem = {
    id: 2,
    name: 'Photos',
    path: '/Photos',
    size: null,
    dateModified: '2024-06-15T10:30:00Z',
    dateCreated: '2024-06-15T10:00:00Z',
    type: 'folder',
    volumeLabel: 'Backup Drive',
    volumePath: 'D:',
  };

  const mockVolumeItem: SearchResultItem = {
    id: 3,
    name: 'Backup Drive',
    path: '',
    size: null,
    dateModified: null,
    dateCreated: null,
    type: 'volume',
    volumeLabel: 'Backup Drive',
    volumePath: 'D:',
  };

  describe('rendering', () => {
    it('should render file item with name and path', () => {
      render(<ResultItem item={mockFileItem} />);

      expect(screen.getByText('vacation-photo.jpg')).toBeInTheDocument();
      expect(
        screen.getByText('D:/Photos/Summer/vacation-photo.jpg')
      ).toBeInTheDocument();
    });

    it('should render folder item', () => {
      render(<ResultItem item={mockFolderItem} />);

      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('D:/Photos')).toBeInTheDocument();
    });

    it('should render volume item', () => {
      render(<ResultItem item={mockVolumeItem} />);

      // Volume name appears in both the name and volume label
      expect(screen.getAllByText('Backup Drive').length).toBeGreaterThanOrEqual(1);
    });

    it('should show correct icon for file', () => {
      render(<ResultItem item={mockFileItem} />);

      expect(screen.getByText('📄')).toBeInTheDocument();
    });

    it('should show correct icon for folder', () => {
      render(<ResultItem item={mockFolderItem} />);

      expect(screen.getByText('📁')).toBeInTheDocument();
    });

    it('should show correct icon for volume', () => {
      render(<ResultItem item={mockVolumeItem} />);

      expect(screen.getByText('💾')).toBeInTheDocument();
    });

    it('should show file size for file items', () => {
      render(<ResultItem item={mockFileItem} />);

      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    });

    it('should not show file size for folder items', () => {
      render(<ResultItem item={mockFolderItem} />);

      // Size should not be in metadata for folders
      expect(screen.queryByText(/MB|KB|GB/)).not.toBeInTheDocument();
    });

    it('should show modified date', () => {
      render(<ResultItem item={mockFileItem} />);

      expect(screen.getByText(/Modified:/)).toBeInTheDocument();
    });

    it('should show volume label', () => {
      render(<ResultItem item={mockFileItem} />);

      expect(screen.getByText(/Volume: Backup Drive/)).toBeInTheDocument();
    });

    it('should handle item without volume path', () => {
      const itemWithoutVolume: SearchResultItem = {
        ...mockFileItem,
        volumePath: null,
      };
      render(<ResultItem item={itemWithoutVolume} />);

      expect(
        screen.getByText('/Photos/Summer/vacation-photo.jpg')
      ).toBeInTheDocument();
    });

    it('should handle item without path (use name as path)', () => {
      const itemWithoutPath: SearchResultItem = {
        ...mockFileItem,
        path: '',
        volumePath: null,
      };
      render(<ResultItem item={itemWithoutPath} />);

      // Name appears in both the name div and path div when no path is set
      expect(screen.getAllByText('vacation-photo.jpg').length).toBe(2);
    });
  });

  describe('search term highlighting', () => {
    it('should highlight search terms in name', () => {
      render(<ResultItem item={mockFileItem} searchTerms={['vacation']} />);

      expect(screen.getAllByText('vacation')[0]).toHaveClass('search-highlight');
    });

    it('should highlight search terms in path', () => {
      render(<ResultItem item={mockFileItem} searchTerms={['Summer']} />);

      const highlights = screen.getAllByText('Summer');
      expect(highlights[0]).toHaveClass('search-highlight');
    });

    it('should highlight multiple search terms', () => {
      render(
        <ResultItem item={mockFileItem} searchTerms={['vacation', 'photo']} />
      );

      expect(screen.getAllByText('vacation')[0]).toHaveClass('search-highlight');
      expect(screen.getAllByText('photo')[0]).toHaveClass('search-highlight');
    });

    it('should be case insensitive when highlighting', () => {
      render(<ResultItem item={mockFileItem} searchTerms={['VACATION']} />);

      expect(screen.getAllByText('vacation')[0]).toHaveClass('search-highlight');
    });
  });
});

describe('formatFileSize', () => {
  it('should return "-" for null size', () => {
    expect(formatFileSize(null)).toBe('-');
  });

  it('should return "-" for 0 size', () => {
    expect(formatFileSize(0)).toBe('-');
  });

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(2097152)).toBe('2.0 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
  });

  it('should format terabytes', () => {
    expect(formatFileSize(1099511627776)).toBe('1.0 TB');
  });
});

describe('formatDate', () => {
  it('should return "-" for null date', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('should format valid date string', () => {
    const result = formatDate('2024-06-15T10:30:00Z');
    // Date formatting varies by locale, just check it's not "-"
    expect(result).not.toBe('-');
    expect(result).toContain('2024');
  });

  it('should return "-" for invalid date string', () => {
    expect(formatDate('not a date')).toBe('-');
  });
});

describe('highlightTerms', () => {
  it('should return text unchanged when no terms provided', () => {
    expect(highlightTerms('some text', [])).toBe('some text');
  });

  it('should highlight matching terms', () => {
    const result = highlightTerms('hello world', ['hello']);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle special regex characters in terms', () => {
    // Should not throw
    const result = highlightTerms('test (pattern)', ['(pattern)']);
    expect(result).toBeDefined();
  });
});
