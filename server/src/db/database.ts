import Database from 'better-sqlite3';
import { stat } from 'fs/promises';
import { ItemType } from '../types/database.js';

/**
 * Database manager for WinCatalog SQLite database
 *
 * Creates an in-memory database with a flattened search_index table
 * that pre-computes all joins and path traversals at load time.
 * Uses iterative JS-based path building and bottom-up folder size
 * computation for O(n) performance regardless of database size.
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
  private lastSize: number = 0;
  private readonly excludePatterns: string[];
  private readonly minFileSize: number;

  constructor(dbPath: string, excludePatterns: string[], minFileSize: number) {
    this.sourceDbPath = dbPath;
    this.excludePatterns = excludePatterns;
    this.minFileSize = minFileSize;
  }

  /**
   * Initialize database connection and build search index
   */
  async init(): Promise<void> {
    const stats = await stat(this.sourceDbPath);
    this.lastModified = stats.mtimeMs;
    this.lastSize = stats.size;

    // Open source database read-only
    const sourceDb = new Database(this.sourceDbPath, { readonly: true });

    // Create in-memory database for fast searches
    this.db = new Database(':memory:');

    // Build the search index using iterative JS approach
    this.createSearchIndex(sourceDb);

    sourceDb.close();
  }

  /**
   * Create the flattened search_index table from source database.
   *
   * Instead of using recursive CTEs (which are O(n * depth) in SQLite and
   * generate millions of intermediate rows), we:
   * 1. Read raw tables into JS Maps — O(n)
   * 2. Build full paths by walking parent pointers — O(n * max_depth)
   * 3. Compute folder sizes bottom-up in a single pass — O(n)
   * 4. Bulk INSERT into search_index — O(n)
   */
  private createSearchIndex(sourceDb: Database.Database): void {
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
        volume_name TEXT
      )
    `);

    // Parse exclude patterns
    const { filenamePatterns, directoryPatterns } = this.parseExcludePatterns();

    // Step 1: Read raw data from source into JS Maps
    const items = sourceDb
      .prepare(
        `SELECT id, itype, name FROM w3_items
         WHERE itype IN (${ItemType.FILE}, ${ItemType.FOLDER}, ${ItemType.VOLUME})`
      )
      .all() as Array<{ id: number; itype: number; name: string }>;

    const fileInfoMap = new Map<
      number,
      {
        name: string | null;
        size: number | null;
        date_change: string | null;
        date_create: string | null;
      }
    >();
    const fileInfoRows = sourceDb
      .prepare(
        'SELECT id_item, name, size, date_change, date_create FROM w3_fileInfo'
      )
      .all() as Array<{
      id_item: number;
      name: string | null;
      size: number | null;
      date_change: string | null;
      date_create: string | null;
    }>;
    for (const row of fileInfoRows) {
      fileInfoMap.set(row.id_item, row);
    }

    const parentMap = new Map<number, number>();
    const childrenMap = new Map<number, number[]>();
    const decentRows = sourceDb
      .prepare('SELECT id_item, id_parent FROM w3_decent')
      .all() as Array<{ id_item: number; id_parent: number | null }>;
    for (const row of decentRows) {
      if (row.id_parent !== null) {
        parentMap.set(row.id_item, row.id_parent);
        let children = childrenMap.get(row.id_parent);
        if (!children) {
          children = [];
          childrenMap.set(row.id_parent, children);
        }
        children.push(row.id_item);
      }
    }

    const volumeSet = new Set<number>();
    const volumeRows = sourceDb
      .prepare('SELECT id_item FROM w3_volumeInfo')
      .all() as Array<{ id_item: number }>;
    for (const row of volumeRows) {
      volumeSet.add(row.id_item);
    }

    // Build a name lookup for all items (for path construction)
    const itemNameMap = new Map<number, string>();
    const itemTypeMap = new Map<number, number>();
    for (const item of items) {
      itemNameMap.set(item.id, item.name);
      itemTypeMap.set(item.id, item.itype);
    }

    // Step 2: Build full paths by walking parent pointers
    // For each item, walk up to the volume, collecting path segments
    // Cache computed paths to avoid redundant walks
    const pathCache = new Map<
      number,
      { path: string; volumeId: number | null }
    >();

    function getPath(id: number): { path: string; volumeId: number | null } {
      const cached = pathCache.get(id);
      if (cached) return cached;

      const segments: string[] = [];
      let current = id;
      let volumeId: number | null = null;
      let depth = 0;

      while (current !== 0 && depth < 100) {
        if (volumeSet.has(current)) {
          volumeId = current;
          break;
        }
        const name = itemNameMap.get(current);
        if (name !== undefined) {
          segments.unshift(name);
        }
        const parent = parentMap.get(current);
        if (parent === undefined) break;
        current = parent;
        depth++;
      }

      const result = { path: '/' + segments.join('/'), volumeId };
      pathCache.set(id, result);
      return result;
    }

    // Step 3: Compute folder sizes bottom-up
    // First, accumulate direct file sizes per parent folder using the
    // source DB (so excluded files still count toward folder sizes)
    const allFileInfoRows = sourceDb
      .prepare(
        `SELECT f.id_item, f.size FROM w3_fileInfo f
         JOIN w3_items i ON i.id = f.id_item
         WHERE i.itype = ${ItemType.FILE}`
      )
      .all() as Array<{ id_item: number; size: number | null }>;

    const folderSizes = new Map<number, number>();

    // Sum file sizes into their direct parent folders
    for (const row of allFileInfoRows) {
      const parent = parentMap.get(row.id_item);
      if (parent !== undefined && parent !== 0) {
        folderSizes.set(
          parent,
          (folderSizes.get(parent) || 0) + (row.size || 0)
        );
      }
    }

    // Propagate folder sizes bottom-up: compute depth for each folder,
    // then process from deepest to shallowest
    const folderDepths: Array<{ id: number; depth: number }> = [];
    for (const item of items) {
      if (item.itype === ItemType.FOLDER) {
        let depth = 0;
        let current = parentMap.get(item.id);
        while (current !== undefined && current !== 0) {
          depth++;
          current = parentMap.get(current);
        }
        folderDepths.push({ id: item.id, depth });
      }
    }

    // Sort deepest first
    folderDepths.sort((a, b) => b.depth - a.depth);

    // Propagate: each folder's size flows up to its parent
    for (const { id } of folderDepths) {
      const size = folderSizes.get(id) || 0;
      const parent = parentMap.get(id);
      if (parent !== undefined && parent !== 0) {
        folderSizes.set(parent, (folderSizes.get(parent) || 0) + size);
      }
    }

    // Step 4: Filter and insert into search_index
    const insert = this.db.prepare(
      `INSERT INTO search_index (id, name, itype, size, date_modified, date_created, full_path, volume_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const filenameMatchers = filenamePatterns.map((p) => this.globToRegex(p));
    const directoryMatchers = directoryPatterns.map((p) => this.globToRegex(p));

    const insertAll = this.db.transaction(() => {
      for (const item of items) {
        const fileInfo = fileInfoMap.get(item.id);
        const displayName = fileInfo?.name || item.name;

        // Apply filename exclude patterns
        if (filenameMatchers.some((re) => re.test(displayName))) {
          continue;
        }

        // Apply min file size filter for files
        if (
          this.minFileSize > 0 &&
          item.itype === ItemType.FILE &&
          (fileInfo?.size || 0) < this.minFileSize
        ) {
          continue;
        }

        // Compute path and volume
        const { path: fullPath, volumeId } = getPath(item.id);
        const volumeName =
          volumeId !== null ? itemNameMap.get(volumeId) || null : null;

        // Apply directory exclude patterns against the full path
        if (
          directoryMatchers.some((re) => {
            // Check if any path segment matches the directory pattern
            const segments = fullPath.split('/');
            return segments.some((seg) => re.test(seg));
          })
        ) {
          continue;
        }

        // Determine size: use folder computed size, or file size
        let size: number | null = null;
        if (item.itype === ItemType.FOLDER) {
          size = folderSizes.get(item.id) || 0;
        } else {
          size = fileInfo?.size ?? null;
        }

        // Apply min file size filter for folders
        if (
          this.minFileSize > 0 &&
          item.itype === ItemType.FOLDER &&
          (size || 0) < this.minFileSize
        ) {
          continue;
        }

        insert.run(
          item.id,
          displayName,
          item.itype,
          size,
          fileInfo?.date_change ?? null,
          fileInfo?.date_create ?? null,
          fullPath,
          volumeName
        );
      }
    });

    insertAll();

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
   * Convert a glob pattern to a RegExp for matching
   */
  private globToRegex(pattern: string): RegExp {
    // Escape regex special chars except *
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Convert glob * to regex .*
    const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr, 'i');
  }

  /**
   * Check if database file has been modified since last load
   * Checks both modification time and file size to detect changes
   */
  async hasFileChanged(): Promise<boolean> {
    try {
      const stats = await stat(this.sourceDbPath);
      return stats.mtimeMs > this.lastModified || stats.size !== this.lastSize;
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

  /**
   * Get last file size
   */
  getLastSize(): number {
    return this.lastSize;
  }
}

// Singleton instance
let dbManager: DatabaseManager | null = null;

/**
 * Initialize the database manager singleton
 */
export async function initDatabase(
  dbPath: string,
  excludePatterns: string[],
  minFileSize: number = 0
): Promise<void> {
  if (dbManager) {
    dbManager.close();
  }
  dbManager = new DatabaseManager(dbPath, excludePatterns, minFileSize);
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
