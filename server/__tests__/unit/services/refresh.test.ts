import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import cron from 'node-cron';
import {
  checkAndReloadIfChanged,
  getLastReloadTime,
  scheduleHourlyRefresh,
  stopScheduledRefresh,
  isScheduledRefreshActive,
  startWatching,
  stopWatching,
  isWatching,
  resetRefreshState,
} from '../../../src/services/refresh.js';

// Mock the database module
vi.mock('../../../src/db/database.js', () => ({
  getDatabase: vi.fn(),
}));

// Mock fs.watch
vi.mock('fs', () => ({
  watch: vi.fn(),
}));

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}));

import { watch } from 'fs';
import { getDatabase } from '../../../src/db/database.js';

describe('Database Refresh Service', () => {
  let mockDbManager: {
    reloadIfChanged: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  };
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRefreshState();

    mockDbManager = {
      reloadIfChanged: vi.fn(),
      reload: vi.fn(),
    };

    vi.mocked(getDatabase).mockReturnValue(mockDbManager as any);

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    resetRefreshState();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('checkAndReloadIfChanged', () => {
    it('should return true when database was reloaded', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(true);

      const result = await checkAndReloadIfChanged();

      expect(result).toBe(true);
      expect(mockDbManager.reloadIfChanged).toHaveBeenCalled();
    });

    it('should return false when database was not reloaded', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(false);

      const result = await checkAndReloadIfChanged();

      expect(result).toBe(false);
    });

    it('should update lastReloadTime when reloaded', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(true);

      const before = new Date();
      await checkAndReloadIfChanged();
      const after = new Date();

      const lastReload = getLastReloadTime();
      expect(lastReload).not.toBeNull();
      expect(lastReload!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastReload!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should not update lastReloadTime when not reloaded', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(false);

      await checkAndReloadIfChanged();

      expect(getLastReloadTime()).toBeNull();
    });

    it('should log when database is reloaded', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(true);

      await checkAndReloadIfChanged();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database reloaded at')
      );
    });
  });

  describe('getLastReloadTime', () => {
    it('should return null when no reload has occurred', () => {
      expect(getLastReloadTime()).toBeNull();
    });

    it('should return the last reload time after reload', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(true);

      await checkAndReloadIfChanged();

      expect(getLastReloadTime()).toBeInstanceOf(Date);
    });
  });

  describe('scheduleHourlyRefresh', () => {
    let mockScheduledTask: {
      stop: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockScheduledTask = {
        stop: vi.fn(),
      };
      vi.mocked(cron.schedule).mockReturnValue(mockScheduledTask as any);
    });

    it('should schedule an hourly cron task', () => {
      scheduleHourlyRefresh();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function)
      );
    });

    it('should stop existing task before scheduling new one', () => {
      scheduleHourlyRefresh();
      scheduleHourlyRefresh();

      expect(mockScheduledTask.stop).toHaveBeenCalled();
    });

    it('should log scheduled refresh info', () => {
      scheduleHourlyRefresh();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled hourly refresh check')
      );
    });

    it('should mark refresh as active after scheduling', () => {
      scheduleHourlyRefresh();

      expect(isScheduledRefreshActive()).toBe(true);
    });

    describe('scheduled callback', () => {
      it('should call checkAndReloadIfChanged when triggered', async () => {
        mockDbManager.reloadIfChanged.mockResolvedValue(false);
        let capturedCallback: () => Promise<void>;

        vi.mocked(cron.schedule).mockImplementation(
          (_expr: string, callback: () => Promise<void>) => {
            capturedCallback = callback;
            return mockScheduledTask as any;
          }
        );

        scheduleHourlyRefresh();
        await capturedCallback!();

        expect(mockDbManager.reloadIfChanged).toHaveBeenCalled();
      });

      it('should handle errors during scheduled refresh', async () => {
        const testError = new Error('Reload failed');
        mockDbManager.reloadIfChanged.mockRejectedValue(testError);
        let capturedCallback: () => Promise<void>;

        vi.mocked(cron.schedule).mockImplementation(
          (_expr: string, callback: () => Promise<void>) => {
            capturedCallback = callback;
            return mockScheduledTask as any;
          }
        );

        scheduleHourlyRefresh();
        await capturedCallback!();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error during scheduled refresh:',
          testError
        );
      });
    });
  });

  describe('stopScheduledRefresh', () => {
    let mockScheduledTask: {
      stop: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockScheduledTask = {
        stop: vi.fn(),
      };
      vi.mocked(cron.schedule).mockReturnValue(mockScheduledTask as any);
    });

    it('should stop active scheduled task', () => {
      scheduleHourlyRefresh();
      stopScheduledRefresh();

      expect(mockScheduledTask.stop).toHaveBeenCalled();
    });

    it('should mark refresh as inactive after stopping', () => {
      scheduleHourlyRefresh();
      stopScheduledRefresh();

      expect(isScheduledRefreshActive()).toBe(false);
    });

    it('should log when stopping', () => {
      scheduleHourlyRefresh();
      stopScheduledRefresh();

      expect(consoleLogSpy).toHaveBeenCalledWith('Scheduled refresh stopped');
    });

    it('should not throw when no task is scheduled', () => {
      expect(() => stopScheduledRefresh()).not.toThrow();
    });
  });

  describe('isScheduledRefreshActive', () => {
    let mockScheduledTask: {
      stop: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockScheduledTask = {
        stop: vi.fn(),
      };
      vi.mocked(cron.schedule).mockReturnValue(mockScheduledTask as any);
    });

    it('should return false when no task is scheduled', () => {
      expect(isScheduledRefreshActive()).toBe(false);
    });

    it('should return true when task is scheduled', () => {
      scheduleHourlyRefresh();

      expect(isScheduledRefreshActive()).toBe(true);
    });

    it('should return false after stopping', () => {
      scheduleHourlyRefresh();
      stopScheduledRefresh();

      expect(isScheduledRefreshActive()).toBe(false);
    });
  });

  describe('resetRefreshState', () => {
    let mockScheduledTask: {
      stop: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockScheduledTask = {
        stop: vi.fn(),
      };
      vi.mocked(cron.schedule).mockReturnValue(mockScheduledTask as any);
    });

    it('should stop scheduled task', () => {
      scheduleHourlyRefresh();
      resetRefreshState();

      expect(mockScheduledTask.stop).toHaveBeenCalled();
    });

    it('should reset lastReloadTime to null', async () => {
      mockDbManager.reloadIfChanged.mockResolvedValue(true);
      await checkAndReloadIfChanged();

      resetRefreshState();

      expect(getLastReloadTime()).toBeNull();
    });

    it('should mark refresh as inactive', () => {
      scheduleHourlyRefresh();
      resetRefreshState();

      expect(isScheduledRefreshActive()).toBe(false);
    });

    it('should stop file watcher', () => {
      const mockClose = vi.fn();
      vi.mocked(watch).mockReturnValue({ close: mockClose } as any);

      startWatching('/data/test.db');
      resetRefreshState();

      expect(mockClose).toHaveBeenCalled();
      expect(isWatching()).toBe(false);
    });
  });

  describe('startWatching', () => {
    let mockClose: ReturnType<typeof vi.fn>;
    let capturedListener: (() => void) | null;

    beforeEach(() => {
      mockClose = vi.fn();
      capturedListener = null;
      vi.mocked(watch).mockImplementation(
        (_path: string, listener: any) => {
          capturedListener = listener as () => void;
          return { close: mockClose } as any;
        }
      );
    });

    it('should start watching the given file path', () => {
      startWatching('/data/test.db');

      expect(watch).toHaveBeenCalledWith('/data/test.db', expect.any(Function));
      expect(isWatching()).toBe(true);
    });

    it('should close previous watcher when called again', () => {
      startWatching('/data/test.db');
      startWatching('/data/test2.db');

      expect(mockClose).toHaveBeenCalled();
    });

    it('should debounce change events and call checkAndReloadIfChanged', async () => {
      vi.useFakeTimers();
      mockDbManager.reloadIfChanged.mockResolvedValue(true);

      startWatching('/data/test.db');
      capturedListener!();

      // Should not have called reload yet (debounce)
      expect(mockDbManager.reloadIfChanged).not.toHaveBeenCalled();

      // Advance past debounce period
      await vi.advanceTimersByTimeAsync(500);

      expect(mockDbManager.reloadIfChanged).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should reset debounce timer on rapid events', async () => {
      vi.useFakeTimers();
      mockDbManager.reloadIfChanged.mockResolvedValue(true);

      startWatching('/data/test.db');
      capturedListener!();
      await vi.advanceTimersByTimeAsync(300);
      capturedListener!(); // second event resets the timer
      await vi.advanceTimersByTimeAsync(300);

      // Still not called — second event reset the 500ms window
      expect(mockDbManager.reloadIfChanged).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(200);
      expect(mockDbManager.reloadIfChanged).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('should handle reload errors gracefully', async () => {
      vi.useFakeTimers();
      const testError = new Error('Reload failed');
      mockDbManager.reloadIfChanged.mockRejectedValue(testError);

      startWatching('/data/test.db');
      capturedListener!();

      await vi.advanceTimersByTimeAsync(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error during file-watch reload:',
        testError
      );
      vi.useRealTimers();
    });
  });

  describe('stopWatching', () => {
    it('should close the watcher', () => {
      const mockClose = vi.fn();
      vi.mocked(watch).mockReturnValue({ close: mockClose } as any);

      startWatching('/data/test.db');
      stopWatching();

      expect(mockClose).toHaveBeenCalled();
      expect(isWatching()).toBe(false);
    });

    it('should not throw when not watching', () => {
      expect(() => stopWatching()).not.toThrow();
    });
  });

  describe('isWatching', () => {
    it('should return false when not watching', () => {
      expect(isWatching()).toBe(false);
    });

    it('should return true when watching', () => {
      vi.mocked(watch).mockReturnValue({ close: vi.fn() } as any);
      startWatching('/data/test.db');

      expect(isWatching()).toBe(true);
    });
  });
});
