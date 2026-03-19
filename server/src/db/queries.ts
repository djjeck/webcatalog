/**
 * Search query builder for WinCatalog database
 * Handles parsing search terms and building SQL queries
 *
 * Queries against a pre-computed search_index table.
 * Search matching always runs against `name_folded`.
 */

import { foldForSearch } from '../utils/search-fold.js';

export interface SearchTerm {
  value: string;
  isPhrase: boolean;
}

/**
 * Parse search string into terms and phrases
 * Handles quoted phrases: "exact phrase"
 * Splits unquoted text by spaces
 */
export function parseSearchQuery(query: string): SearchTerm[] {
  query = query.trim();
  if (query === '') {
    return [];
  }

  const terms: SearchTerm[] = [];

  // Split around quotes first because they have precedence
  const split = query.split(`"`);
  let isPhrase = false;
  while (split.length > 0) {
    const portion = split.shift()!.trim();
    // If we are inside quotes, don't split around spaces
    const subPortions = isPhrase ? [portion] : portion.split(' ');
    for (const subPortion of subPortions) {
      if (subPortion !== '') {
        terms.push({ value: subPortion, isPhrase });
      }
    }
    // Since we split around quotes, we alternate between in-quote mode and regular mode
    isPhrase = !isPhrase;
  }

  return terms;
}

/**
 * Build SQL LIKE pattern for a search term
 * Escapes special SQL LIKE characters (%, _)
 */
export function buildLikePattern(term: string): string {
  // Escape special SQL LIKE characters
  const escaped = term.replace(/[%_]/g, '\\$&');

  // Wrap with wildcards for partial matching
  return `%${escaped}%`;
}

/**
 * Convert a glob-like pattern to SQL LIKE pattern
 * Supports * as wildcard (matches any characters)
 * Examples:
 *   "*.tmp" -> "%\\.tmp"
 *   "@eaDir/*" -> "@eaDir/%"
 *   "Thumbs.db" -> "Thumbs\\.db"
 */
export function globToLikePattern(pattern: string): string {
  // Escape SQL LIKE special characters (% and _), but preserve * for conversion
  let escaped = pattern.replace(/[%_]/g, '\\$&');

  // Escape literal dots (common in file patterns)
  escaped = escaped.replace(/\./g, '\\.');

  // Convert glob * to SQL %
  escaped = escaped.replace(/\*/g, '%');

  return escaped;
}

/**
 * Build SQL WHERE clause for search terms
 * Returns clause and parameters for prepared statement
 *
 * Searches against the flattened search_index table (single column: name_folded)
 */
export function buildSearchWhereClause(terms: SearchTerm[]): {
  clause: string;
  params: string[];
} {
  if (terms.length === 0) {
    return { clause: '1=1', params: [] };
  }

  const conditions: string[] = [];
  const params: string[] = [];

  for (const term of terms) {
    // Search normalized names for accent-insensitive matching.
    conditions.push(`name_folded LIKE ? ESCAPE '\\' COLLATE NOCASE`);
    params.push(buildLikePattern(foldForSearch(term.value)));
  }

  // Combine all conditions with AND (all terms must match)
  const clause = conditions.join(' AND ');

  return { clause, params };
}

/**
 * Build complete search query SQL
 * Queries the pre-computed search_index table directly.
 */
/**
 * Build a query that returns a single random row from the search_index
 */
export function buildRandomQuery(): { sql: string; params: [] } {
  const sql = `
    SELECT
      id,
      name,
      itype,
      name as file_name,
      size,
      date_modified as date_change,
      date_created as date_create,
      NULL as id_parent,
      volume_name,
      full_path
    FROM search_index
    ORDER BY RANDOM()
    LIMIT 1
  `.trim();

  return { sql, params: [] };
}

export function buildSearchQuery(searchString: string): {
  sql: string;
  params: string[];
} {
  const terms = parseSearchQuery(searchString);
  const { clause, params } = buildSearchWhereClause(terms);

  // Query against precomputed table using normalized column filters.
  const sql = `
    SELECT
      id,
      name,
      itype,
      name as file_name,
      size,
      date_modified as date_change,
      date_created as date_create,
      NULL as id_parent,
      volume_name,
      full_path
    FROM search_index
    WHERE ${clause}
    ORDER BY size DESC
  `.trim();

  return { sql, params };
}
