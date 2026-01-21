import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  getDatabase,
  closeDatabase,
} from '../../src/db/database.js';
import { buildSearchQuery } from '../../src/db/queries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, '../utils/test tree.w3cat');

interface RawSearchRow {
  id: number;
  name: string;
  itype: number;
  file_name: string | null;
  size: number | null;
  date_change: string | null;
  date_create: string | null;
  id_parent: number | null;
  volume_label: string | null;
  root_path: string | null;
  full_path: string | null;
}

function executeTestSearch(
  query: string,
): RawSearchRow[] {
  const db = getDatabase().getDb();
  const { sql, params } = buildSearchQuery(query);
  const stmt = db.prepare(sql);
  return stmt.all(...params) as RawSearchRow[];
}

/**
 * Integration tests for search functionality against the real test database.
 *
 * Test database structure (indexed from generate-test-files.sh output):
 * - root_1/
 *   - .config, config (hidden vs regular file)
 *   - .hidden_dir/secret.txt
 *   - case_sensitivity/Archive/report.pdf
 *   - deep/level_1/level_2/level_3/deep_file.txt
 *   - duplicate_names/sub_a/unique.conf, sub_b/unique.conf
 *   - prefix_tests/data, data_extended.txt
 *   - special_chars/file with spaces.log, study_guide.v1.2.md, ⚡_energy_⚡.txt
 * - root_2/
 *   - config
 *   - duplicate_names/sub_a/unique.conf, sub_b/unique.conf
 *
 * The search uses a pre-computed search_index table that flattens all joins
 * at initialization time, making queries fast and simple.
 */
describe('Search against real test database', () => {
  beforeAll(async () => {
    await initDatabase(TEST_DB_PATH, []);
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('prefix matching - search "data"', () => {
    it('should find files with "data" as exact name and as prefix', () => {
      const results = executeTestSearch('data');
      const names = results.map((r) => r.file_name || r.name);

      // Test database contains: data, data_extended.txt
      expect(names).toContain('data');
      expect(names).toContain('data_extended.txt');
    });

    it('should return exactly 2 results for "data" (exact match + prefix match)', () => {
      const results = executeTestSearch('data');
      expect(results.length).toBe(2);
    });

    it('should use partial matching (LIKE %data%)', () => {
      // Searching for "extended" should find data_extended.txt
      const results = executeTestSearch('extended');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('data_extended.txt');
    });
  });

  describe('duplicate filenames - search "unique.conf"', () => {
    it('should find all 6 unique.conf files', () => {
      const results = executeTestSearch('unique.conf');

      // Database has 6 unique.conf files:
      // root_1/duplicate_names/sub_a/unique.conf
      // root_1/duplicate_names/sub_b/unique.conf
      // root_2/duplicate_names/sub_a/unique.conf
      // root_2/duplicate_names/sub_b/unique.conf
      // root_2/duplicate_names/@eaDir/sub_a/unique.conf
      // root_2/duplicate_names/@eaDir/sub_b/unique.conf
      expect(results.length).toBe(6);
    });

    it('should have full_path with different directories for each unique.conf', () => {
      const results = executeTestSearch('unique.conf');
      const paths = results.map((r) => r.full_path);

      // All 6 files should have different full paths
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(6);

      // Verify paths include sub_a and sub_b in different roots
      const hasRoot1SubA = paths.some(
        (p) => p?.includes('root_1') && p?.includes('sub_a')
      );
      const hasRoot1SubB = paths.some(
        (p) => p?.includes('root_1') && p?.includes('sub_b')
      );
      const hasRoot2SubA = paths.some(
        (p) => p?.includes('root_2') && p?.includes('sub_a')
      );
      const hasRoot2SubB = paths.some(
        (p) => p?.includes('root_2') && p?.includes('sub_b')
      );

      expect(hasRoot1SubA).toBe(true);
      expect(hasRoot1SubB).toBe(true);
      expect(hasRoot2SubA).toBe(true);
      expect(hasRoot2SubB).toBe(true);
    });

    it('should have pre-computed full_path for all results', () => {
      // With the flattened search_index, full_path is pre-computed at init time
      const results = executeTestSearch('unique.conf');
      results.forEach((r) => {
        expect(r.full_path).not.toBeNull();
        expect(r.full_path).toContain('unique.conf');
      });
    });
  });

  describe('case sensitivity - search "archive"', () => {
    it('should find Archive folder (case insensitive search)', () => {
      const results = executeTestSearch('archive');
      const names = results.map((r) => r.file_name || r.name);

      // Database has "Archive" (capital A), search is case insensitive
      expect(names).toContain('Archive');
    });

    it('should find Archive when searching with uppercase', () => {
      const results = executeTestSearch('ARCHIVE');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('Archive');
    });

    it('should find report.pdf inside Archive', () => {
      const results = executeTestSearch('report');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('report.pdf');
    });
  });

  describe('extension search - search ".txt"', () => {
    it('should find files with .txt extension', () => {
      const results = executeTestSearch('.txt');
      const names = results.map((r) => r.file_name || r.name);

      // Should find: deep_file.txt, data_extended.txt, secret.txt, ⚡_energy_⚡.txt
      expect(names).toContain('deep_file.txt');
      expect(names).toContain('data_extended.txt');
      expect(names).toContain('secret.txt');
      expect(names).toContain('⚡_energy_⚡.txt');
    });

    it('should find at least 4 .txt files', () => {
      const results = executeTestSearch('.txt');
      expect(results.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('deep nesting - search "deep_file"', () => {
    it('should find deep_file.txt with underscore (ESCAPE clause now works)', () => {
      // The underscore escaping bug was fixed by adding ESCAPE '\\' to the LIKE clause
      const results = executeTestSearch('deep_file');
      expect(results.length).toBe(1);

      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('deep_file.txt');
    });

    it('should find deep_file.txt when searching without underscore', () => {
      // Searching for parts of the name still works
      const results = executeTestSearch('deep');
      const names = results.map((r) => r.file_name || r.name);
      // Finds both the "deep" folder and "deep_file.txt"
      expect(names).toContain('deep_file.txt');
      expect(names).toContain('deep');
    });

    it('should find deep_file.txt when searching for txt extension', () => {
      const results = executeTestSearch('.txt');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('deep_file.txt');
    });

    it('should have full path showing deep nesting', () => {
      const results = executeTestSearch('deep_file');
      expect(results[0].full_path).toContain('deep');
      expect(results[0].full_path).toContain('level_1');
      expect(results[0].full_path).toContain('level_2');
      expect(results[0].full_path).toContain('level_3');
    });
  });

  describe('special characters - search for space character', () => {
    it('should find "file with spaces.log" when searching for phrase', () => {
      // Search handles spaces by splitting into multiple terms
      const results = executeTestSearch('file with spaces');
      const names = results.map((r) => r.file_name || r.name);

      expect(names).toContain('file with spaces.log');
    });

    it('should find file using quoted phrase search', () => {
      // Quoted phrase treats the whole thing as one search term
      const results = executeTestSearch('"file with spaces"');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('file with spaces.log');
    });

    it('should find file with partial space-containing term', () => {
      const results = executeTestSearch('spaces');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('file with spaces.log');
    });
  });

  describe('additional edge cases', () => {
    it('should find hidden files (.config)', () => {
      const results = executeTestSearch('.config');
      const names = results.map((r) => r.file_name || r.name);

      expect(names).toContain('.config');
    });

    it('should find study_guide.v1.2.md with underscore (ESCAPE clause now works)', () => {
      // The underscore escaping bug was fixed
      const results = executeTestSearch('study_guide');
      expect(results.length).toBe(1);

      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('study_guide.v1.2.md');
    });

    it('should find study_guide.v1.2.md when searching without underscore', () => {
      // Workaround still works
      const results = executeTestSearch('study');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('study_guide.v1.2.md');
    });

    it('should find files with unicode characters', () => {
      const results = executeTestSearch('energy');
      const names = results.map((r) => r.file_name || r.name);

      expect(names).toContain('⚡_energy_⚡.txt');
    });

    it('should find secret.txt in hidden directory', () => {
      const results = executeTestSearch('secret');
      const names = results.map((r) => r.file_name || r.name);

      expect(names).toContain('secret.txt');
      expect(results.length).toBe(1);
    });

    it('should find both config and .config when searching for "config"', () => {
      const results = executeTestSearch('config');
      const names = results.map((r) => r.file_name || r.name);

      // Should find .config (hidden) and config (in root_1 and root_2)
      expect(names).toContain('config');
      expect(names).toContain('.config');
      // root_1/config, root_1/.config, root_2/config
      expect(results.length).toBe(3);
    });
  });

  describe('quoted phrase search', () => {
    it('should match exact phrase in quotes', () => {
      const results = executeTestSearch('"file with"');
      const names = results.map((r) => r.file_name || r.name);

      // Should match "file with spaces.log"
      expect(names).toContain('file with spaces.log');
    });

    it('should match partial phrase in quotes', () => {
      const results = executeTestSearch('"with spaces"');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('file with spaces.log');
    });
  });

  describe('multiple terms (AND logic)', () => {
    it('should require all terms to match when unquoted', () => {
      // "file" AND "spaces" should match "file with spaces.log"
      const results = executeTestSearch('file spaces');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('file with spaces.log');
    });

    it('should return no results if any term does not match', () => {
      // "file" AND "nonexistent" should return nothing
      const results = executeTestSearch('file nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('folder search', () => {
    it('should find folders with underscores (ESCAPE clause now works)', () => {
      // prefix_tests and root_1 have underscores - now findable
      const prefixResults = executeTestSearch('prefix_tests');
      const rootResults = executeTestSearch('root_1');

      expect(prefixResults.length).toBe(1);
      expect(rootResults.length).toBe(1);
    });

    it('should find folders without underscores in name', () => {
      const results = executeTestSearch('Archive');
      expect(results.length).toBe(1);
      expect(results[0].itype).toBe(200); // folder
    });

    it('should find folders when searching partial name without underscore', () => {
      // Search for "prefix" instead of "prefix_tests"
      const results = executeTestSearch('prefix');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('prefix_tests');
    });
  });

  describe('full_path pre-computation', () => {
    it('should have full_path for all indexed items', () => {
      const results = executeTestSearch('config');
      results.forEach((r) => {
        expect(r.full_path).not.toBeNull();
      });
    });

    it('should show complete directory hierarchy in full_path', () => {
      const results = executeTestSearch('secret');
      expect(results[0].full_path).toBe('root_1/.hidden_dir/secret.txt');
    });

    it('should show report.pdf under case_sensitivity/Archive', () => {
      const results = executeTestSearch('report.pdf');
      expect(results[0].full_path).toBe(
        'root_1/case_sensitivity/Archive/report.pdf'
      );
    });
  });
});

/**
 * Tests for excludePatterns feature.
 * Each test suite reinitializes the database with specific exclude patterns
 * to verify files are filtered out during indexing.
 */
describe('Exclude patterns integration tests', () => {
  afterEach(() => {
    closeDatabase();
  });

  describe('exclude by extension pattern (*.txt)', () => {
    beforeEach(async () => {
      await initDatabase(TEST_DB_PATH, ['*.txt']);
    });

    it('should not find any .txt files when *.txt is excluded', () => {
      const results = executeTestSearch('.txt');
      expect(results.length).toBe(0);
    });

    it('should not find deep_file.txt when *.txt is excluded', () => {
      const results = executeTestSearch('deep_file');
      expect(results.length).toBe(0);
    });

    it('should not find secret.txt when *.txt is excluded', () => {
      const results = executeTestSearch('secret');
      expect(results.length).toBe(0);
    });

    it('should still find non-.txt files like .log files', () => {
      const results = executeTestSearch('.log');
      const names = results.map((r) => r.file_name || r.name);
      expect(names).toContain('file with spaces.log');
    });

    it('should still find .pdf files', () => {
      const results = executeTestSearch('report.pdf');
      expect(results.length).toBe(1);
    });

    it('should still find .conf files', () => {
      const results = executeTestSearch('unique.conf');
      expect(results.length).toBe(6);
    });
  });

  describe('exclude by exact filename (config)', () => {
    beforeEach(async () => {
      await initDatabase(TEST_DB_PATH, ['config']);
    });

    it('should not find files named exactly "config"', () => {
      const results = executeTestSearch('config');
      const names = results.map((r) => r.file_name || r.name);

      // Should only find .config (hidden file), not "config"
      expect(names).toContain('.config');
      expect(names.filter((n) => n === 'config').length).toBe(0);
    });

    it('should still find .config (hidden file)', () => {
      const results = executeTestSearch('.config');
      expect(results.length).toBe(1);
    });
  });

  describe('exclude by directory pattern with /* suffix', () => {
    beforeEach(async () => {
      // Exclude the .hidden_dir directory and all its contents
      await initDatabase(TEST_DB_PATH, ['.hidden_dir/*']);
    });

    it('should not find files inside excluded directory', () => {
      // secret.txt is inside .hidden_dir
      const results = executeTestSearch('secret');
      expect(results.length).toBe(0);
    });

    it('should not find the excluded directory itself', () => {
      const results = executeTestSearch('.hidden_dir');
      expect(results.length).toBe(0);
    });

    it('should still find files outside the excluded directory', () => {
      const results = executeTestSearch('config');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('exclude by directory pattern with / suffix', () => {
    beforeEach(async () => {
      // Exclude the deep directory and all nested contents
      await initDatabase(TEST_DB_PATH, ['deep/']);
    });

    it('should not find deeply nested files', () => {
      // deep_file.txt is inside deep/level_1/level_2/level_3/
      const results = executeTestSearch('deep_file');
      expect(results.length).toBe(0);
    });

    it('should not find intermediate directories', () => {
      const results = executeTestSearch('level_1');
      expect(results.length).toBe(0);
    });

    it('should not find the excluded directory itself', () => {
      const results = executeTestSearch('deep');
      // Should not find the "deep" folder
      const names = results.map((r) => r.file_name || r.name);
      expect(names).not.toContain('deep');
    });

    it('should still find other files', () => {
      const results = executeTestSearch('.txt');
      // Should find other .txt files but not deep_file.txt
      const names = results.map((r) => r.file_name || r.name);
      expect(names).not.toContain('deep_file.txt');
      expect(names).toContain('secret.txt');
    });
  });

  describe('exclude @eaDir directory (Synology NAS system directory)', () => {
    it('should find @eaDir contents when not excluded', async () => {
      // First verify @eaDir and its contents exist in the test database
      await initDatabase(TEST_DB_PATH, []);

      // @eaDir directory itself
      const eaDirResults = executeTestSearch('@eaDir');
      expect(eaDirResults.length).toBe(1);

      // unique.conf files - should be 6 total:
      // 4 in root_1 and root_2 duplicate_names (outside @eaDir)
      // 2 in root_2/duplicate_names/@eaDir/sub_a and sub_b
      const confResults = executeTestSearch('unique.conf');
      expect(confResults.length).toBe(6);
    });

    it('should not find @eaDir directory when excluded', async () => {
      await initDatabase(TEST_DB_PATH, ['@eaDir/']);

      const results = executeTestSearch('@eaDir');
      expect(results.length).toBe(0);
    });

    it('should not find files inside @eaDir when excluded', async () => {
      await initDatabase(TEST_DB_PATH, ['@eaDir/']);

      // Should only find 4 unique.conf files (not the 2 inside @eaDir)
      const confResults = executeTestSearch('unique.conf');
      expect(confResults.length).toBe(4);

      // Verify none of the results are from @eaDir
      const paths = confResults.map((r) => r.full_path);
      const hasEaDir = paths.some((p) => p?.includes('@eaDir'));
      expect(hasEaDir).toBe(false);
    });

    it('should not find nested directories inside @eaDir when excluded', async () => {
      await initDatabase(TEST_DB_PATH, ['@eaDir/']);

      // sub_a and sub_b exist both inside and outside @eaDir
      // When @eaDir is excluded, we should still find the ones outside
      const subAResults = executeTestSearch('sub_a');
      const subBResults = executeTestSearch('sub_b');

      // Verify none are inside @eaDir
      for (const result of [...subAResults, ...subBResults]) {
        expect(result.full_path).not.toContain('@eaDir');
      }
    });
  });

  describe('exclude .DS_Store files (macOS system files)', () => {
    it('should find .DS_Store when not excluded', async () => {
      await initDatabase(TEST_DB_PATH, []);

      const results = executeTestSearch('.DS_Store');
      expect(results.length).toBe(1);
      expect(results[0].full_path).toBe('root_2/duplicate_names/.DS_Store');
    });

    it('should not find .DS_Store when excluded', async () => {
      await initDatabase(TEST_DB_PATH, ['.DS_Store']);

      const results = executeTestSearch('.DS_Store');
      expect(results.length).toBe(0);
    });

    it('should still find other files when .DS_Store is excluded', async () => {
      await initDatabase(TEST_DB_PATH, ['.DS_Store']);

      const results = executeTestSearch('unique.conf');
      expect(results.length).toBe(6);
    });
  });

  describe('exclude both @eaDir and .DS_Store (common NAS exclusions)', () => {
    beforeEach(async () => {
      // Common pattern for Synology NAS users
      await initDatabase(TEST_DB_PATH, ['@eaDir/', '.DS_Store']);
    });

    it('should not find @eaDir directory or contents', () => {
      const eaDirResults = executeTestSearch('@eaDir');
      expect(eaDirResults.length).toBe(0);

      // Only 4 unique.conf files (not the 2 inside @eaDir)
      const confResults = executeTestSearch('unique.conf');
      expect(confResults.length).toBe(4);
    });

    it('should not find .DS_Store files', () => {
      const results = executeTestSearch('.DS_Store');
      expect(results.length).toBe(0);
    });

    it('should still find all other files', () => {
      const configResults = executeTestSearch('config');
      expect(configResults.length).toBeGreaterThan(0);

      const txtResults = executeTestSearch('.txt');
      expect(txtResults.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('exclude multiple directories', () => {
    beforeEach(async () => {
      // Exclude multiple directories
      await initDatabase(TEST_DB_PATH, ['.hidden_dir/', 'special_chars/']);
    });

    it('should not find files in first excluded directory', () => {
      const results = executeTestSearch('secret');
      expect(results.length).toBe(0);
    });

    it('should not find files in second excluded directory', () => {
      // special_chars contains: file with spaces.log, study_guide.v1.2.md, ⚡_energy_⚡.txt
      const logResults = executeTestSearch('"file with spaces"');
      const mdResults = executeTestSearch('study_guide');
      const emojiResults = executeTestSearch('energy');

      expect(logResults.length).toBe(0);
      expect(mdResults.length).toBe(0);
      expect(emojiResults.length).toBe(0);
    });

    it('should still find files in non-excluded directories', () => {
      const results = executeTestSearch('unique.conf');
      expect(results.length).toBe(6);
    });
  });

  describe('mixed filename and directory patterns', () => {
    beforeEach(async () => {
      // Mix of filename pattern (*.conf) and directory pattern (deep/)
      await initDatabase(TEST_DB_PATH, ['*.conf', 'deep/']);
    });

    it('should not find .conf files (filename pattern)', () => {
      const results = executeTestSearch('unique.conf');
      expect(results.length).toBe(0);
    });

    it('should not find files in excluded directory (directory pattern)', () => {
      const results = executeTestSearch('deep_file');
      expect(results.length).toBe(0);
    });

    it('should still find other files', () => {
      const results = executeTestSearch('config');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('exclude hidden files pattern (.*)', () => {
    beforeEach(async () => {
      await initDatabase(TEST_DB_PATH, ['.*']);
    });

    it('should not find .config when .* is excluded', () => {
      const results = executeTestSearch('.config');
      expect(results.length).toBe(0);
    });

    it('should still find regular config file', () => {
      const results = executeTestSearch('config');
      const names = results.map((r) => r.file_name || r.name);

      // Should find "config" files but not ".config"
      expect(names).toContain('config');
      expect(names).not.toContain('.config');
    });
  });

  describe('exclude multiple patterns', () => {
    beforeEach(async () => {
      await initDatabase(TEST_DB_PATH, ['*.txt', '*.conf', '*.pdf']);
    });

    it('should not find .txt files', () => {
      const results = executeTestSearch('.txt');
      expect(results.length).toBe(0);
    });

    it('should not find .conf files', () => {
      const results = executeTestSearch('unique.conf');
      expect(results.length).toBe(0);
    });

    it('should not find .pdf files', () => {
      const results = executeTestSearch('report.pdf');
      expect(results.length).toBe(0);
    });

    it('should still find .log files', () => {
      const results = executeTestSearch('.log');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should still find .md files', () => {
      const results = executeTestSearch('study_guide');
      expect(results.length).toBe(1);
    });
  });

  describe('exclude pattern with underscore', () => {
    beforeEach(async () => {
      // Exclude files containing underscore - tests that _ is properly escaped
      await initDatabase(TEST_DB_PATH, ['*_*']);
    });

    it('should not find files with underscores in name', () => {
      const deepResults = executeTestSearch('deep_file');
      const studyResults = executeTestSearch('study_guide');
      const dataResults = executeTestSearch('data_extended');

      expect(deepResults.length).toBe(0);
      expect(studyResults.length).toBe(0);
      expect(dataResults.length).toBe(0);
    });

    it('should still find files without underscores', () => {
      const results = executeTestSearch('config');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should still find files with spaces (no underscore)', () => {
      const results = executeTestSearch('"file with spaces"');
      expect(results.length).toBe(1);
    });
  });
});
