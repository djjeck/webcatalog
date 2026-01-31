/**
 * Search query builder for WinCatalog database
 * Handles parsing search terms and building SQL queries
 *
 * Queries against the pre-computed search_index table for fast searches.
 */

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
 * Searches against the flattened search_index table (single column: name)
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
    // Search only in the name column of the flattened search_index
    conditions.push(`name LIKE ? ESCAPE '\\' COLLATE NOCASE`);
    const pattern = buildLikePattern(term.value);
    params.push(pattern);
  }

  // Combine all conditions with AND (all terms must match)
  const clause = conditions.join(' AND ');

  return { clause, params };
}

/**
 * Build complete search query SQL
 * Queries the pre-computed search_index table directly.
 */
export function buildSearchQuery(searchString: string): {
  sql: string;
  params: string[];
} {
  const terms = parseSearchQuery(searchString);
  const { clause, params } = buildSearchWhereClause(terms);

  // Simple query against the flattened search_index table
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
      volume_label,
      volume_path as root_path,
      full_path
    FROM search_index
    WHERE ${clause}
    ORDER BY size DESC
  `.trim();

  return { sql, params };
}
