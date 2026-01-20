import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../../src/components/StatusBar';
import { formatBytes, formatLastUpdated } from '../../src/utils/format';
import type { DbStatusResponse } from '../../src/types/api';

describe('StatusBar', () => {
  const mockDbStatus: DbStatusResponse = {
    connected: true,
    path: '/data/catalog.w3cat',
    fileSize: 1073741824, // 1 GB
    lastModified: '2024-06-15T10:30:00Z',
    lastLoaded: new Date().toISOString(), // Just now
    statistics: {
      totalItems: 15000,
      totalFiles: 12000,
      totalFolders: 2500,
      totalVolumes: 5,
      totalSize: 5368709120000, // 5 TB
    },
  };

  describe('loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<StatusBar dbStatus={null} isLoading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('status-bar-loading');
    });
  });

  describe('error state', () => {
    it('should show error message when error is provided', () => {
      render(
        <StatusBar
          dbStatus={null}
          error="Failed to connect to database"
        />
      );

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to connect to database')
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('status-bar-error');
    });
  });

  describe('unknown state', () => {
    it('should show unknown when no dbStatus provided', () => {
      render(<StatusBar dbStatus={null} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('status-bar-unknown');
    });
  });

  describe('connected state', () => {
    it('should show connected indicator', () => {
      render(<StatusBar dbStatus={mockDbStatus} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('status-bar-connected');
    });

    it('should show file count', () => {
      render(<StatusBar dbStatus={mockDbStatus} />);

      expect(screen.getByText('12,000 files')).toBeInTheDocument();
    });

    it('should show folder count', () => {
      render(<StatusBar dbStatus={mockDbStatus} />);

      expect(screen.getByText('2,500 folders')).toBeInTheDocument();
    });

    it('should show volume count', () => {
      render(<StatusBar dbStatus={mockDbStatus} />);

      expect(screen.getByText('5 volumes')).toBeInTheDocument();
    });

    it('should show database size', () => {
      render(<StatusBar dbStatus={mockDbStatus} />);

      expect(screen.getByText('DB: 1.0 GB')).toBeInTheDocument();
    });

    it('should show last updated time', () => {
      render(<StatusBar dbStatus={mockDbStatus} />);

      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });
  });

  describe('disconnected state', () => {
    it('should show disconnected when connected is false', () => {
      const disconnectedStatus: DbStatusResponse = {
        ...mockDbStatus,
        connected: false,
      };
      render(<StatusBar dbStatus={disconnectedStatus} />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveClass('status-bar-disconnected');
    });
  });
});

describe('formatBytes', () => {
  it('should return default "-" for zero', () => {
    expect(formatBytes(0)).toBe('-');
  });

  it('should return default "-" for null', () => {
    expect(formatBytes(null)).toBe('-');
  });

  it('should return custom nullDisplay for zero', () => {
    expect(formatBytes(0, '0 B')).toBe('0 B');
  });

  it('should format bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('should format kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
  });

  it('should format terabytes correctly', () => {
    expect(formatBytes(1099511627776)).toBe('1.0 TB');
  });
});

describe('formatLastUpdated', () => {
  it('should return "Just now" for very recent dates', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const thirtySecondsAgo = new Date('2024-06-15T11:59:30Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(thirtySecondsAgo.toISOString())).toBe('Just now');

    vi.useRealTimers();
  });

  it('should return minutes ago for recent dates', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const fiveMinutesAgo = new Date('2024-06-15T11:55:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(fiveMinutesAgo.toISOString())).toBe('5 minutes ago');

    vi.useRealTimers();
  });

  it('should return "1 minute ago" for singular', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const oneMinuteAgo = new Date('2024-06-15T11:59:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(oneMinuteAgo.toISOString())).toBe('1 minute ago');

    vi.useRealTimers();
  });

  it('should return hours ago for dates within 24 hours', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const threeHoursAgo = new Date('2024-06-15T09:00:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(threeHoursAgo.toISOString())).toBe('3 hours ago');

    vi.useRealTimers();
  });

  it('should return "1 hour ago" for singular', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const oneHourAgo = new Date('2024-06-15T11:00:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(oneHourAgo.toISOString())).toBe('1 hour ago');

    vi.useRealTimers();
  });

  it('should return days ago for dates within a week', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const threeDaysAgo = new Date('2024-06-12T12:00:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(threeDaysAgo.toISOString())).toBe('3 days ago');

    vi.useRealTimers();
  });

  it('should return "1 day ago" for singular', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const oneDayAgo = new Date('2024-06-14T12:00:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatLastUpdated(oneDayAgo.toISOString())).toBe('1 day ago');

    vi.useRealTimers();
  });

  it('should return formatted date for older dates', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    const twoWeeksAgo = new Date('2024-06-01T12:00:00Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = formatLastUpdated(twoWeeksAgo.toISOString());
    // Should contain the year
    expect(result).toContain('2024');

    vi.useRealTimers();
  });
});
