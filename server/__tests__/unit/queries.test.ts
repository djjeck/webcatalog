import { describe, it, expect } from 'vitest';
import {
  parseSearchQuery,
  buildLikePattern,
  globToLikePattern,
  buildSearchWhereClause,
  buildSearchQuery,
  type SearchTerm,
} from '../../src/db/queries.js';

describe('parseSearchQuery', () => {
  it('should return empty array for empty string', () => {
    expect(parseSearchQuery('')).toEqual([]);
  });

  it('should return empty array for whitespace only', () => {
    expect(parseSearchQuery('   ')).toEqual([]);
  });

  it('should parse single term', () => {
    const result = parseSearchQuery('vacation');
    expect(result).toEqual([{ value: 'vacation', isPhrase: false }]);
  });

  it('should parse multiple terms', () => {
    const result = parseSearchQuery('vacation photos 2024');
    expect(result).toEqual([
      { value: 'vacation', isPhrase: false },
      { value: 'photos', isPhrase: false },
      { value: '2024', isPhrase: false },
    ]);
  });

  it('should parse quoted phrase', () => {
    const result = parseSearchQuery('"summer vacation"');
    expect(result).toEqual([{ value: 'summer vacation', isPhrase: true }]);
  });

  it('should parse mixed quoted and unquoted terms', () => {
    const result = parseSearchQuery('vacation "summer 2024" photos');
    expect(result).toEqual([
      { value: 'vacation', isPhrase: false },
      { value: 'summer 2024', isPhrase: true },
      { value: 'photos', isPhrase: false },
    ]);
  });

  it('should handle multiple quoted phrases', () => {
    const result = parseSearchQuery('"first phrase" "second phrase"');
    expect(result).toEqual([
      { value: 'first phrase', isPhrase: true },
      { value: 'second phrase', isPhrase: true },
    ]);
  });

  it('should handle unclosed quote as phrase to end', () => {
    const result = parseSearchQuery('"unclosed phrase');
    expect(result).toEqual([{ value: 'unclosed phrase', isPhrase: true }]);
  });

  it('should handle empty quotes', () => {
    const result = parseSearchQuery('""');
    expect(result).toEqual([]);
  });

  it('should handle extra whitespace', () => {
    const result = parseSearchQuery('  term1   term2  ');
    expect(result).toEqual([
      { value: 'term1', isPhrase: false },
      { value: 'term2', isPhrase: false },
    ]);
  });

  it('should handle whitespace around quotes', () => {
    const result = parseSearchQuery('  "quoted phrase"  term  ');
    expect(result).toEqual([
      { value: 'quoted phrase', isPhrase: true },
      { value: 'term', isPhrase: false },
    ]);
  });

  it('should handle special characters in terms', () => {
    const result = parseSearchQuery('file.txt test-file test_file');
    expect(result).toEqual([
      { value: 'file.txt', isPhrase: false },
      { value: 'test-file', isPhrase: false },
      { value: 'test_file', isPhrase: false },
    ]);
  });

  it('should handle special characters in quoted phrases', () => {
    const result = parseSearchQuery('"file with spaces.txt"');
    expect(result).toEqual([
      { value: 'file with spaces.txt', isPhrase: true },
    ]);
  });
});

describe('buildLikePattern', () => {
  it('should wrap term with wildcards', () => {
    expect(buildLikePattern('test')).toBe('%test%');
  });

  it('should escape % character', () => {
    expect(buildLikePattern('test%file')).toBe('%test\\%file%');
  });

  it('should escape _ character', () => {
    expect(buildLikePattern('test_file')).toBe('%test\\_file%');
  });

  it('should escape both % and _', () => {
    expect(buildLikePattern('test%_file')).toBe('%test\\%\\_file%');
  });

  it('should handle empty string', () => {
    expect(buildLikePattern('')).toBe('%%');
  });

  it('should handle special characters that do not need escaping', () => {
    expect(buildLikePattern('test.file')).toBe('%test.file%');
    expect(buildLikePattern('test-file')).toBe('%test-file%');
  });
});

describe('globToLikePattern', () => {
  it('should convert * to %', () => {
    expect(globToLikePattern('*.tmp')).toBe('%\\.tmp');
  });

  it('should handle multiple wildcards', () => {
    expect(globToLikePattern('*test*')).toBe('%test%');
  });

  it('should escape dots', () => {
    expect(globToLikePattern('file.txt')).toBe('file\\.txt');
  });

  it('should escape SQL % character', () => {
    expect(globToLikePattern('test%file')).toBe('test\\%file');
  });

  it('should escape SQL _ character', () => {
    expect(globToLikePattern('test_file')).toBe('test\\_file');
  });

  it('should handle directory patterns', () => {
    expect(globToLikePattern('@eaDir/*')).toBe('@eaDir/%');
  });

  it('should handle exact filename', () => {
    expect(globToLikePattern('Thumbs.db')).toBe('Thumbs\\.db');
  });

  it('should handle complex pattern', () => {
    expect(globToLikePattern('*.tmp.*')).toBe('%\\.tmp\\.%');
  });

  it('should handle empty string', () => {
    expect(globToLikePattern('')).toBe('');
  });
});

describe('buildSearchWhereClause', () => {
  it('should return 1=1 for empty terms', () => {
    const result = buildSearchWhereClause([], []);
    expect(result.clause).toBe('1=1');
    expect(result.params).toEqual([]);
  });

  it('should build clause for single term', () => {
    const terms: SearchTerm[] = [{ value: 'vacation', isPhrase: false }];
    const result = buildSearchWhereClause(terms, []);

    expect(result.clause).toBe(
      '(w3_items.name LIKE ? COLLATE NOCASE OR w3_fileInfo.name LIKE ? COLLATE NOCASE)'
    );
    expect(result.params).toEqual(['%vacation%', '%vacation%']);
  });

  it('should build clause for multiple terms with AND', () => {
    const terms: SearchTerm[] = [
      { value: 'vacation', isPhrase: false },
      { value: 'photos', isPhrase: false },
    ];
    const result = buildSearchWhereClause(terms, []);

    expect(result.clause).toBe(
      '(w3_items.name LIKE ? COLLATE NOCASE OR w3_fileInfo.name LIKE ? COLLATE NOCASE) AND ' +
        '(w3_items.name LIKE ? COLLATE NOCASE OR w3_fileInfo.name LIKE ? COLLATE NOCASE)'
    );
    expect(result.params).toEqual([
      '%vacation%',
      '%vacation%',
      '%photos%',
      '%photos%',
    ]);
  });

  it('should build clause for quoted phrase', () => {
    const terms: SearchTerm[] = [{ value: 'summer vacation', isPhrase: true }];
    const result = buildSearchWhereClause(terms, []);

    expect(result.clause).toBe(
      '(w3_items.name LIKE ? COLLATE NOCASE OR w3_fileInfo.name LIKE ? COLLATE NOCASE)'
    );
    expect(result.params).toEqual(['%summer vacation%', '%summer vacation%']);
  });

  it('should escape special SQL characters in params', () => {
    const terms: SearchTerm[] = [{ value: 'test%_file', isPhrase: false }];
    const result = buildSearchWhereClause(terms, []);

    expect(result.params).toEqual(['%test\\%\\_file%', '%test\\%\\_file%']);
  });
});

describe('buildSearchQuery', () => {
  it('should build complete SQL query for single term', () => {
    const result = buildSearchQuery('vacation', []);

    expect(result.sql).toContain('SELECT');
    expect(result.sql).toContain('FROM w3_items');
    expect(result.sql).toContain('LEFT JOIN w3_fileInfo');
    expect(result.sql).toContain('LEFT JOIN w3_decent');
    expect(result.sql).toContain('LEFT JOIN w3_volumeInfo');
    expect(result.sql).toContain('WHERE');
    expect(result.sql).toContain('ORDER BY sr.name ASC'); // sr is the alias in the recursive CTE
    expect(result.params).toEqual(['%vacation%', '%vacation%']);
  });

  it('should build query for multiple terms', () => {
    const result = buildSearchQuery('vacation photos', []);

    expect(result.sql).toContain('AND');
    expect(result.params).toEqual([
      '%vacation%',
      '%vacation%',
      '%photos%',
      '%photos%',
    ]);
  });

  it('should build query for quoted phrase', () => {
    const result = buildSearchQuery('"summer vacation"', []);

    expect(result.params).toEqual(['%summer vacation%', '%summer vacation%']);
  });

  it('should build query for mixed terms and phrases', () => {
    const result = buildSearchQuery('vacation "summer 2024" photos', []);

    expect(result.params).toEqual([
      '%vacation%',
      '%vacation%',
      '%summer 2024%',
      '%summer 2024%',
      '%photos%',
      '%photos%',
    ]);
  });

  it('should build query with 1=1 for empty search', () => {
    const result = buildSearchQuery('', []);

    expect(result.sql).toContain('WHERE 1=1');
    expect(result.params).toEqual([]);
  });

  it('should select all necessary columns', () => {
    const result = buildSearchQuery('test', []);

    // Columns selected in search_results CTE
    expect(result.sql).toContain('w3_items.id');
    expect(result.sql).toContain('w3_items.name');
    expect(result.sql).toContain('w3_items.itype');
    expect(result.sql).toContain('w3_fileInfo.name as file_name');
    expect(result.sql).toContain('w3_fileInfo.size');
    expect(result.sql).toContain('w3_fileInfo.date_change');
    expect(result.sql).toContain('w3_fileInfo.date_create');
    expect(result.sql).toContain('w3_decent.id_parent');
    // Volume info is joined via volume_ancestors CTE using vi alias
    expect(result.sql).toContain('vi.volume_label');
    expect(result.sql).toContain('vi.root_path');
    // Full path is computed by the recursive CTE
    expect(result.sql).toContain('va.full_path');
  });

  it('should handle SQL injection attempts', () => {
    const maliciousInputs = [
      "'; DROP TABLE w3_items; --",
      "' OR '1'='1",
      "'; DELETE FROM w3_items WHERE '1'='1",
      "test' UNION SELECT * FROM w3_items --",
    ];

    for (const input of maliciousInputs) {
      const result = buildSearchQuery(input, []);

      // Should be safely escaped in parameters
      expect(result.params.length).toBeGreaterThan(0);
      expect(result.sql).not.toContain('DROP TABLE');
      expect(result.sql).not.toContain('DELETE FROM');
      expect(result.sql).not.toContain('UNION SELECT');
    }
  });

  it('should handle edge cases', () => {
    const edgeCases = ['   ', '""""', '" "', '   "   "   '];

    for (const input of edgeCases) {
      const result = buildSearchQuery(input, []);

      // Should handle gracefully without errors
      expect(result.sql).toBeDefined();
      expect(result.params).toBeDefined();
    }
  });
});
