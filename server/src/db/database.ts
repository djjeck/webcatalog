import Database from 'better-sqlite3';
import { stat } from 'fs/promises';
import { ItemType } from '../types/database.js';

/**
 * Database manager for WinCatalog SQLite database
 *
 * Creates an in-memory database with a flattened search_index table
 * that pre-computes all joins and path traversals at load time.
 * This moves expensive operations from query time (~200ms per keystroke)
 * to initialization time (~weeks between reloads).
 *
 * Supports exclude patterns to filter out files during indexing:
 * - Filename patterns: "*.tmp", "Thumbs.db", ".*" (hidden files)
 * - Directory patterns: "@eaDir/", "node_modules/" (excludes directory and all contents)
 *
 * Pattern format rules:
 * - Patterns without "/" match against filenames only
 * - Patterns ending with "/" or "/*" match directories in the path
 * - Patterns with "/" in other positions are invalid and will be ignored with a warning
 */
class DatabaseManager {
  private db: Database.Database | null = null;
  private sourceDbPath: string;
  private lastModified: number = 0;
  private readonly excludePatterns: string[];

  constructor(dbPath: string, excludePatterns: string[]) {
    this.sourceDbPath = dbPath;
    this.excludePatterns = excludePatterns;
  }

  /**
   * Initialize database connection and build search index
   */
  async init(): Promise<void> {
    const stats = await stat(this.sourceDbPath);
    this.lastModified = stats.mtimeMs;

    // Create in-memory database for fast searches
    this.db = new Database(':memory:');

    // Attach the source WinCatalog database as read-only
    this.db.exec(`ATTACH DATABASE '${this.sourceDbPath}' AS source`);

    // Create the flattened search index table
    this.createSearchIndex();

    // Detach source database - we no longer need it
    this.db.exec('DETACH DATABASE source');
  }

  /**
   * Create the flattened search_index table from source database
   * This pre-computes all joins, path traversals, and volume lookups
   */
  private createSearchIndex(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Create the search_index table structure
    this.db.exec(`
      CREATE TABLE search_index (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        itype INTEGER NOT NULL,
        size INTEGER,
        date_modified TEXT,
        date_created TEXT,
        full_path TEXT,
        volume_label TEXT,
        volume_path TEXT
      )
    `);

    // Parse and categorize exclude patterns
    const { filenamePatterns, directoryPatterns } = this.parseExcludePatterns();

    // Build exclude conditions for filename patterns (applied in base case)
    const filenameExcludeConditions =
      this.buildFilenameExcludeConditions(filenamePatterns);

    // Build exclude conditions for directory patterns (applied after path computation)
    const directoryExcludeConditions =
      this.buildDirectoryExcludeConditions(directoryPatterns);

    // Populate with pre-computed data using the recursive CTE
    // This expensive operation runs once at init, not per-query
    const insertSql = `
      INSERT INTO search_index (id, name, itype, size, date_modified, date_created, full_path, volume_label, volume_path)
      WITH RECURSIVE
      -- Walk up the parent tree to build full paths and find volume ancestors
      ancestor_paths AS (
        -- Base case: start with each item
        SELECT
          i.id,
          i.name,
          i.itype,
          f.name as file_name,
          f.size,
          f.date_change,
          f.date_create,
          d.id_parent,
          COALESCE(f.name, i.name) as path_segment,
          i.id as current_ancestor,
          0 as depth
        FROM source.w3_items i
        LEFT JOIN source.w3_fileInfo f ON i.id = f.id_item
        LEFT JOIN source.w3_decent d ON i.id = d.id_item
        -- Exclude system items (catalog root, contacts, tags, etc.)
        WHERE i.itype IN (${ItemType.FILE}, ${ItemType.FOLDER}, ${ItemType.VOLUME})
        ${filenameExcludeConditions}

        UNION ALL

        -- Recursive case: prepend parent name to path
        SELECT
          ap.id,
          ap.name,
          ap.itype,
          ap.file_name,
          ap.size,
          ap.date_change,
          ap.date_create,
          d.id_parent,
          parent.name || '/' || ap.path_segment,
          d.id_parent as current_ancestor,
          ap.depth + 1
        FROM ancestor_paths ap
        JOIN source.w3_decent d ON ap.current_ancestor = d.id_item
        JOIN source.w3_items parent ON d.id_parent = parent.id
        WHERE d.id_parent IS NOT NULL
          AND d.id_parent != 0  -- Stop at root (id_parent=0 means root)
          AND ap.depth < 100  -- Safety limit
      ),
      -- Get the final path for each item: pick the longest path (deepest ancestor traversal)
      -- or the one that reached a volume
      best_paths AS (
        SELECT
          ap.id,
          ap.name,
          ap.itype,
          ap.file_name,
          ap.size,
          ap.date_change,
          ap.date_create,
          ap.path_segment as full_path,
          ap.current_ancestor as volume_id,
          ROW_NUMBER() OVER (
            PARTITION BY ap.id
            ORDER BY
              -- Prefer paths that reached a volume
              CASE WHEN vi.id_item IS NOT NULL THEN 0 ELSE 1 END,
              -- Otherwise take the longest path
              ap.depth DESC
          ) as rn
        FROM ancestor_paths ap
        LEFT JOIN source.w3_volumeInfo vi ON ap.current_ancestor = vi.id_item
      )
      SELECT
        bp.id,
        COALESCE(bp.file_name, bp.name) as name,
        bp.itype,
        bp.size,
        bp.date_change,
        bp.date_create,
        bp.full_path,
        vi.volume_label,
        vi.root_path
      FROM best_paths bp
      LEFT JOIN source.w3_volumeInfo vi ON bp.volume_id = vi.id_item
      WHERE bp.rn = 1
        ${directoryExcludeConditions}
    `;

    this.db.exec(insertSql);

    // Compute folder sizes by summing all descendant file sizes
    // Folders (itype=200) don't have entries in w3_fileInfo, so we
    // recursively walk the w3_decent hierarchy to sum file sizes.
    this.db.exec(`
      UPDATE search_index
      SET size = (
        WITH RECURSIVE descendants AS (
          SELECT id_item FROM source.w3_decent WHERE id_parent = search_index.id
          UNION ALL
          SELECT d.id_item FROM source.w3_decent d
          JOIN descendants ds ON d.id_parent = ds.id_item
        )
        SELECT COALESCE(SUM(si.size), 0)
        FROM descendants ds
        JOIN search_index si ON si.id = ds.id_item
        WHERE si.itype = ${ItemType.FILE}
      )
      WHERE search_index.itype = ${ItemType.FOLDER}
    `);

    // Create index on name for fast LIKE searches
    this.db.exec(
      'CREATE INDEX idx_search_name ON search_index(name COLLATE NOCASE)'
    );
  }

  /**
   * Validate and categorize exclude patterns.
   *
   * Pattern types:
   * - Filename patterns: no "/" (e.g., "*.tmp", "Thumbs.db")
   * - Directory patterns: ends with "/" or "/*" (e.g., "@eaDir/", "node_modules/*")
   * - Invalid patterns: "/" in other positions (logged and ignored)
   */
  private parseExcludePatterns(): {
    filenamePatterns: string[];
    directoryPatterns: string[];
  } {
    const filenamePatterns: string[] = [];
    const directoryPatterns: string[] = [];

    for (const pattern of this.excludePatterns) {
      // Check if pattern contains a slash
      const slashIndex = pattern.indexOf('/');

      if (slashIndex === -1) {
        // No slash - filename pattern
        filenamePatterns.push(pattern);
      } else if (slashIndex === pattern.length - 1) {
        // Ends with "/" - directory pattern (e.g., "@eaDir/")
        directoryPatterns.push(pattern.slice(0, -1)); // Remove trailing /
      } else if (slashIndex === pattern.length - 2 && pattern.endsWith('/*')) {
        // Ends with "/*" - directory pattern (e.g., "@eaDir/*")
        directoryPatterns.push(pattern.slice(0, -2)); // Remove trailing /*
      } else {
        // Slash in invalid position
        console.error(
          `Invalid exclude pattern "${pattern}": slash (/) is only allowed at the end (e.g., "dirName/" or "dirName/*"). Pattern ignored.`
        );
      }
    }

    return { filenamePatterns, directoryPatterns };
  }

  /**
   * Convert a glob pattern to SQL LIKE pattern
   */
  private globToSqlPattern(pattern: string): string {
    let sqlPattern = pattern.replace(/[%_]/g, '\\$&');
    sqlPattern = sqlPattern.replace(/\./g, '\\.');
    sqlPattern = sqlPattern.replace(/\*/g, '%');
    return sqlPattern;
  }

  /**
   * Build SQL conditions to exclude filename patterns from indexing.
   * Applied in the base case of the recursive CTE.
   */
  private buildFilenameExcludeConditions(filenamePatterns: string[]): string {
    if (filenamePatterns.length === 0) {
      return '';
    }

    const conditions = filenamePatterns.map((pattern) => {
      const sqlPattern = this.globToSqlPattern(pattern);
      return `AND COALESCE(f.name, i.name) NOT LIKE '${sqlPattern}' ESCAPE '\\'`;
    });

    return conditions.join('\n        ');
  }

  /**
   * Build SQL conditions to exclude directory patterns from final results.
   * Applied after full_path is computed, excluding items within matched directories.
   *
   * For a directory pattern "dirName", we exclude:
   * - The directory itself: full_path ends with "/dirName" or equals "dirName"
   * - All contents: full_path contains "/dirName/"
   */
  private buildDirectoryExcludeConditions(directoryPatterns: string[]): string {
    if (directoryPatterns.length === 0) {
      return '';
    }

    const conditions = directoryPatterns.map((dirName) => {
      const sqlPattern = this.globToSqlPattern(dirName);
      // Match: exactly the dir, ends with /dir, or contains /dir/
      return `AND NOT (
              bp.full_path = '${sqlPattern}'
              OR bp.full_path LIKE '%/${sqlPattern}' ESCAPE '\\'
              OR bp.full_path LIKE '%/${sqlPattern}/%' ESCAPE '\\'
              OR bp.full_path LIKE '${sqlPattern}/%' ESCAPE '\\'
            )`;
    });

    return conditions.join('\n        ');
  }

  /**
   * Check if database file has been modified since last load
   */
  async hasFileChanged(): Promise<boolean> {
    try {
      const stats = await stat(this.sourceDbPath);
      return stats.mtimeMs > this.lastModified;
    } catch (error) {
      console.error('Error checking file modification time:', error);
      return false;
    }
  }

  /**
   * Reload database if file has changed
   */
  async reloadIfChanged(): Promise<boolean> {
    const changed = await this.hasFileChanged();
    if (changed) {
      await this.reload();
      return true;
    }
    return false;
  }

  /**
   * Force reload database connection
   */
  async reload(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    await this.init();
  }

  /**
   * Get database instance
   */
  getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get database file path
   */
  getPath(): string {
    return this.sourceDbPath;
  }

  /**
   * Get last modified timestamp
   */
  getLastModified(): number {
    return this.lastModified;
  }
}

// Singleton instance
let dbManager: DatabaseManager | null = null;

/**
 * Initialize the database manager singleton
 */
export async function initDatabase(
  dbPath: string,
  excludePatterns: string[]
): Promise<void> {
  if (dbManager) {
    dbManager.close();
  }
  dbManager = new DatabaseManager(dbPath, excludePatterns);
  await dbManager.init();
}

/**
 * Get the database manager singleton instance
 */
export function getDatabase(): DatabaseManager {
  if (!dbManager) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbManager;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbManager) {
    dbManager.close();
    dbManager = null;
  }
}
