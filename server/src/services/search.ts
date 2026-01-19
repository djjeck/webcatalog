/**
 * Search service for WinCatalog database
 * Handles search execution, result mapping, and sorting
 */

import { getDatabase } from '../db/database.js';
import { buildSearchQuery } from '../db/queries.js';
import { checkAndReloadIfChanged } from './refresh.js';
import type { SearchResultItem, SearchResponse } from '../types/api.js';
import { ItemType } from '../types/database.js';

/**
 * Raw database row from search query
 */
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

/**
 * Default maximum number of results to return
 */
const DEFAULT_LIMIT = 100;

/**
 * Maximum allowed limit
 */
const MAX_LIMIT = 1000;

/**
 * Determine item type from itype value
 * Based on analysis of actual WinCatalog database:
 * - itype=1: File
 * - itype=200: Folder
 * - itype=172: Volume
 * - itype=150: Catalog root
 */
export function getItemType(itype: number): 'file' | 'folder' | 'volume' {
  if (itype === ItemType.VOLUME) {
    return 'volume';
  }
  if (itype === ItemType.FOLDER || itype === ItemType.CATALOG_ROOT) {
    return 'folder';
  }
  // itype=1 (FILE) and any other values default to file
  return 'file';
}

/**
 * Build file path from parent hierarchy
 * Uses full_path computed by the recursive CTE query
 */
export function buildPath(row: RawSearchRow): string {
  // If we have the full path from the recursive query, use it
  if (row.full_path) {
    // Prepend volume root path or label if available
    if (row.root_path) {
      return `${row.root_path}${row.full_path}`;
    }
    if (row.volume_label) {
      return `[${row.volume_label}]/${row.full_path}`;
    }
    return row.full_path;
  }

  // Fallback: use the file_name if available, otherwise use item name
  const name = row.file_name || row.name;

  if (row.root_path) {
    return `${row.root_path}${name}`;
  }

  if (row.volume_label) {
    return `[${row.volume_label}]/${name}`;
  }

  return name;
}

/**
 * Format date string for API response
 * WinCatalog stores dates in various formats
 */
export function formatDate(dateStr: string | null): string | null {
  if (!dateStr) {
    return null;
  }

  // Try to parse and format as ISO string
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // If parsing fails, return original string
    return dateStr;
  }

  return date.toISOString();
}

/**
 * Map raw database row to SearchResultItem
 */
export function mapRowToSearchResult(row: RawSearchRow): SearchResultItem {
  return {
    id: row.id,
    name: row.file_name || row.name,
    path: buildPath(row),
    size: row.size,
    dateModified: formatDate(row.date_change),
    dateCreated: formatDate(row.date_create),
    type: getItemType(row.itype),
    volumeLabel: row.volume_label,
    volumePath: row.root_path,
  };
}

/**
 * Execute search against database
 */
export async function executeSearch(
  query: string,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0
): Promise<SearchResponse> {
  const startTime = performance.now();

  // Validate and clamp limit
  const effectiveLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const effectiveOffset = Math.max(0, offset);

  // Check if database needs reloading (centralized in refresh service)
  await checkAndReloadIfChanged();

  // Get database instance
  const db = getDatabase().getDb();

  // Build search query
  const { sql, params } = buildSearchQuery(query);

  // Add LIMIT and OFFSET to query
  const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
  const paginatedParams = [...params, effectiveLimit, effectiveOffset];

  // Execute query
  const stmt = db.prepare(paginatedSql);
  const rows = stmt.all(...paginatedParams) as RawSearchRow[];

  // Map results to API format
  const results = rows.map(mapRowToSearchResult);

  const endTime = performance.now();
  const executionTime = Math.round(endTime - startTime);

  return {
    query,
    results,
    totalResults: results.length,
    executionTime,
  };
}

/**
 * Get total count of items matching search query
 * Useful for pagination information
 */
export async function getSearchCount(query: string): Promise<number> {
  const dbManager = getDatabase();
  const db = dbManager.getDb();

  const { sql, params } = buildSearchQuery(query);

  // Wrap query to count results
  const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
  const stmt = db.prepare(countSql);
  const result = stmt.get(...params) as { count: number };

  return result.count;
}
