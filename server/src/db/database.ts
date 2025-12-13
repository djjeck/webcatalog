import Database from 'better-sqlite3';
import { stat } from 'fs/promises';

/**
 * Database manager for WinCatalog SQLite database
 * Handles connection, reloading on file changes, and singleton instance
 */
class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;
  private lastModified: number = 0;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize database connection
   */
  async init(): Promise<void> {
    const stats = await stat(this.dbPath);
    this.lastModified = stats.mtimeMs;

    this.db = new Database(this.dbPath, {
      readonly: true,
      fileMustExist: true,
    });

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Check if database file has been modified since last load
   */
  async hasFileChanged(): Promise<boolean> {
    try {
      const stats = await stat(this.dbPath);
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
    return this.dbPath;
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
export async function initDatabase(dbPath: string): Promise<void> {
  if (dbManager) {
    dbManager.close();
  }
  dbManager = new DatabaseManager(dbPath);
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
