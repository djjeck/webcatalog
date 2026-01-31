import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getItemType,
  buildPath,
  formatDate,
  mapRowToSearchResult,
  executeSearch,
  getSearchCount,
} from '../../../src/services/search.js';
import { ItemType } from '../../../src/types/database.js';

// Mock the database module
vi.mock('../../../src/db/database.js', () => ({
  getDatabase: vi.fn(),
}));

// Mock the queries module
vi.mock('../../../src/db/queries.js', () => ({
  buildSearchQuery: vi.fn(),
}));

// Mock the refresh service
vi.mock('../../../src/services/refresh.js', () => ({
  checkAndReloadIfChanged: vi.fn(),
}));

import { getDatabase } from '../../../src/db/database.js';
import { buildSearchQuery } from '../../../src/db/queries.js';
import { checkAndReloadIfChanged } from '../../../src/services/refresh.js';

describe('getItemType', () => {
  it('should return "volume" for VOLUME type (172)', () => {
    expect(getItemType(ItemType.VOLUME)).toBe('volume');
    expect(getItemType(172)).toBe('volume');
  });

  it('should return "folder" for FOLDER type (200) and CATALOG_ROOT (150)', () => {
    expect(getItemType(ItemType.FOLDER)).toBe('folder');
    expect(getItemType(200)).toBe('folder');
    expect(getItemType(ItemType.CATALOG_ROOT)).toBe('folder');
    expect(getItemType(150)).toBe('folder');
  });

  it('should return "file" for FILE type (1) and other types', () => {
    expect(getItemType(ItemType.FILE)).toBe('file');
    expect(getItemType(1)).toBe('file');
    expect(getItemType(0)).toBe('file');
    expect(getItemType(2)).toBe('file');
    expect(getItemType(3)).toBe('file');
    expect(getItemType(4)).toBe('file');
    expect(getItemType(100)).toBe('file');
  });
});

describe('buildPath', () => {
  it('should return full_path when available', () => {
    const row = {
      id: 1,
      name: 'item_name',
      itype: 0,
      file_name: 'actual_file.txt',
      size: 100,
      date_change: null,
      date_create: null,
      id_parent: null,
      volume_name: null,
      full_path: '/Folder/actual_file.txt',
    };

    expect(buildPath(row)).toBe('/Folder/actual_file.txt');
  });

  it('should fall back to file_name when full_path is null', () => {
    const row = {
      id: 1,
      name: 'item_name',
      itype: 0,
      file_name: 'actual_file.txt',
      size: 100,
      date_change: null,
      date_create: null,
      id_parent: null,
      volume_name: null,
      full_path: null,
    };

    expect(buildPath(row)).toBe('actual_file.txt');
  });

  it('should fall back to name when file_name and full_path are null', () => {
    const row = {
      id: 1,
      name: 'item_name',
      itype: 0,
      file_name: null,
      size: 100,
      date_change: null,
      date_create: null,
      id_parent: null,
      volume_name: null,
      full_path: null,
    };

    expect(buildPath(row)).toBe('item_name');
  });
});

describe('formatDate', () => {
  it('should return null for null input', () => {
    expect(formatDate(null)).toBeNull();
  });

  it('should format valid date string to ISO format', () => {
    const result = formatDate('2024-01-15 10:30:00');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should handle ISO date strings', () => {
    const isoDate = '2024-01-15T10:30:00.000Z';
    const result = formatDate(isoDate);
    expect(result).toBe(isoDate);
  });

  it('should return original string for invalid date', () => {
    const invalidDate = 'not-a-date';
    expect(formatDate(invalidDate)).toBe(invalidDate);
  });

  it('should handle empty string as falsy and return null', () => {
    // Empty string is falsy, so returns null
    const result = formatDate('');
    expect(result).toBeNull();
  });
});

describe('mapRowToSearchResult', () => {
  it('should map raw row to SearchResultItem', () => {
    const row = {
      id: 123,
      name: 'test_item',
      itype: ItemType.FILE,
      file_name: 'test.txt',
      size: 1024,
      date_change: '2024-01-15T10:00:00.000Z',
      date_create: '2024-01-10T08:00:00.000Z',
      id_parent: 1,
      volume_name: 'USB Drive',
      full_path: '/Documents/test.txt',
    };

    const result = mapRowToSearchResult(row);

    expect(result).toEqual({
      id: 123,
      name: 'test.txt',
      path: '/Documents/test.txt',
      size: 1024,
      dateModified: '2024-01-15T10:00:00.000Z',
      dateCreated: '2024-01-10T08:00:00.000Z',
      type: 'file',
      volumeName: 'USB Drive',
    });
  });

  it('should handle null values', () => {
    const row = {
      id: 123,
      name: 'folder_item',
      itype: ItemType.FOLDER,
      file_name: null,
      size: null,
      date_change: null,
      date_create: null,
      id_parent: null,
      volume_name: null,
      full_path: null,
    };

    const result = mapRowToSearchResult(row);

    expect(result).toEqual({
      id: 123,
      name: 'folder_item',
      path: 'folder_item',
      size: 0,
      dateModified: null,
      dateCreated: null,
      type: 'folder',
      volumeName: null,
    });
  });

  it('should correctly identify volume type', () => {
    const row = {
      id: 1,
      name: 'Volume',
      itype: ItemType.VOLUME,
      file_name: null,
      size: null,
      date_change: null,
      date_create: null,
      id_parent: null,
      volume_name: 'External',
      full_path: null,
    };

    const result = mapRowToSearchResult(row);

    expect(result.type).toBe('volume');
  });
});

describe('executeSearch', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };
  let mockStatement: {
    all: ReturnType<typeof vi.fn>;
  };
  let mockDbManager: {
    getDb: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStatement = {
      all: vi.fn(),
    };

    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStatement),
    };

    mockDbManager = {
      getDb: vi.fn().mockReturnValue(mockDb),
    };

    vi.mocked(getDatabase).mockReturnValue(mockDbManager as any);
    vi.mocked(checkAndReloadIfChanged).mockResolvedValue(false);
    vi.mocked(buildSearchQuery).mockReturnValue({
      sql: 'SELECT * FROM items WHERE name LIKE ?',
      params: ['%test%'],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should execute search and return results', async () => {
    const mockRows = [
      {
        id: 1,
        name: 'test_file',
        itype: ItemType.FILE,
        file_name: 'test.txt',
        size: 1024,
        date_change: '2024-01-15',
        date_create: '2024-01-10',
        id_parent: null,
        volume_name: null,
        full_path: null,
      },
    ];

    mockStatement.all.mockReturnValue(mockRows);

    const result = await executeSearch('test');

    expect(result.query).toBe('test');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].name).toBe('test.txt');
    expect(result.totalResults).toBe(1);
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('should check for database reload before search', async () => {
    mockStatement.all.mockReturnValue([]);

    await executeSearch('test');

    expect(checkAndReloadIfChanged).toHaveBeenCalled();
  });

  it('should use default limit when not specified', async () => {
    mockStatement.all.mockReturnValue([]);

    await executeSearch('test');

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT ? OFFSET ?')
    );
    // Default limit is 100, offset is 0
    expect(mockStatement.all).toHaveBeenCalledWith('%test%', 100, 0);
  });

  it('should respect custom limit and offset', async () => {
    mockStatement.all.mockReturnValue([]);

    await executeSearch('test', 50, 10);

    expect(mockStatement.all).toHaveBeenCalledWith('%test%', 50, 10);
  });

  it('should clamp limit to MAX_LIMIT', async () => {
    mockStatement.all.mockReturnValue([]);

    await executeSearch('test', 5000);

    // MAX_LIMIT is 1000
    expect(mockStatement.all).toHaveBeenCalledWith('%test%', 1000, 0);
  });

  it('should clamp limit to minimum of 1', async () => {
    mockStatement.all.mockReturnValue([]);

    await executeSearch('test', -5);

    expect(mockStatement.all).toHaveBeenCalledWith('%test%', 1, 0);
  });

  it('should clamp offset to minimum of 0', async () => {
    mockStatement.all.mockReturnValue([]);

    await executeSearch('test', 10, -5);

    expect(mockStatement.all).toHaveBeenCalledWith('%test%', 10, 0);
  });

  it('should handle empty results', async () => {
    mockStatement.all.mockReturnValue([]);

    const result = await executeSearch('nonexistent');

    expect(result.results).toEqual([]);
    expect(result.totalResults).toBe(0);
  });

  it('should map multiple results correctly', async () => {
    const mockRows = [
      {
        id: 1,
        name: 'file1',
        itype: ItemType.FILE,
        file_name: 'file1.txt',
        size: 100,
        date_change: null,
        date_create: null,
        id_parent: null,
        volume_name: null,
        full_path: null,
      },
      {
        id: 2,
        name: 'file2',
        itype: ItemType.FILE,
        file_name: 'file2.txt',
        size: 200,
        date_change: null,
        date_create: null,
        id_parent: null,
        volume_name: null,
        full_path: null,
      },
    ];

    mockStatement.all.mockReturnValue(mockRows);

    const result = await executeSearch('file');

    expect(result.results).toHaveLength(2);
    expect(result.results[0].name).toBe('file1.txt');
    expect(result.results[1].name).toBe('file2.txt');
  });
});

describe('getSearchCount', () => {
  let mockDb: {
    prepare: ReturnType<typeof vi.fn>;
  };
  let mockStatement: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockDbManager: {
    getDb: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStatement = {
      get: vi.fn(),
    };

    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStatement),
    };

    mockDbManager = {
      getDb: vi.fn().mockReturnValue(mockDb),
    };

    vi.mocked(getDatabase).mockReturnValue(mockDbManager as any);
    vi.mocked(buildSearchQuery).mockReturnValue({
      sql: 'SELECT * FROM items WHERE name LIKE ?',
      params: ['%test%'],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return count of matching items', async () => {
    mockStatement.get.mockReturnValue({ count: 42 });

    const count = await getSearchCount('test');

    expect(count).toBe(42);
  });

  it('should wrap query in COUNT', async () => {
    mockStatement.get.mockReturnValue({ count: 0 });

    await getSearchCount('test');

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*) as count FROM')
    );
  });

  it('should return 0 for no matches', async () => {
    mockStatement.get.mockReturnValue({ count: 0 });

    const count = await getSearchCount('nonexistent');

    expect(count).toBe(0);
  });

  it('should pass search params to query', async () => {
    mockStatement.get.mockReturnValue({ count: 5 });

    await getSearchCount('test');

    expect(mockStatement.get).toHaveBeenCalledWith('%test%');
  });
});
