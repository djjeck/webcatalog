/**
 * Search query builder for WinCatalog database
 * Handles parsing search terms and building SQL queries
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
 */
export function buildSearchWhereClause(
  terms: SearchTerm[],
  excludePatterns: string[]
): {
  clause: string;
  params: string[];
} {
  if (terms.length === 0) {
    return { clause: '1=1', params: [] };
  }

  const conditions: string[] = [];
  const params: string[] = [];

  for (const term of terms) {
    // Search in both w3_items.name and w3_fileInfo.name
    conditions.push(
      `(w3_items.name LIKE ? COLLATE NOCASE OR w3_fileInfo.name LIKE ? COLLATE NOCASE)`
    );
    const pattern = buildLikePattern(term.value);
    // Add pattern twice, for two params
    params.push(pattern, pattern);
  }

  for (const excludePattern of excludePatterns) {
    conditions.push(
      `(w3_items.name NOT LIKE ? COLLATE NOCASE AND w3_fileInfo.name NOT LIKE ? COLLATE NOCASE)`
    );
    const pattern = globToLikePattern(excludePattern);
    // Add pattern twice, for two params
    params.push(pattern, pattern);
  }

  // Combine all conditions with AND (all terms must match)
  const clause = conditions.join(' AND ');

  return { clause, params };
}

/**
 * Build complete search query SQL
 * Joins necessary tables and applies search conditions
 *
 * Uses a recursive CTE to walk up the parent tree to find the volume ancestor,
 * since volume info is only stored on volume items (itype=172), not on files/folders.
 * Also builds the full path by collecting ancestor names.
 */
export function buildSearchQuery(
  searchString: string,
  excludePatterns: string[]
): {
  sql: string;
  params: string[];
} {
  const terms = parseSearchQuery(searchString);
  const { clause, params } = buildSearchWhereClause(terms, excludePatterns);

  // Use recursive CTE to find volume ancestor and build path
  const sql = `
    WITH RECURSIVE
    -- First, get the base search results
    search_results AS (
      SELECT
        w3_items.id,
        w3_items.name,
        w3_items.itype,
        w3_fileInfo.name as file_name,
        w3_fileInfo.size,
        w3_fileInfo.date_change,
        w3_fileInfo.date_create,
        w3_decent.id_parent
      FROM w3_items
      LEFT JOIN w3_fileInfo ON w3_items.id = w3_fileInfo.id_item
      LEFT JOIN w3_decent ON w3_items.id = w3_decent.id_item
      WHERE ${clause}
    ),
    -- Walk up the parent tree to find volume ancestor
    ancestor_chain AS (
      -- Base case: start with each search result's parent
      SELECT
        sr.id as original_id,
        sr.id_parent as current_id,
        1 as depth,
        sr.name as path_segment
      FROM search_results sr
      WHERE sr.id_parent IS NOT NULL

      UNION ALL

      -- Recursive case: keep walking up until we find a volume or hit root
      SELECT
        ac.original_id,
        d.id_parent as current_id,
        ac.depth + 1,
        i.name || '/' || ac.path_segment as path_segment
      FROM ancestor_chain ac
      JOIN w3_decent d ON ac.current_id = d.id_item
      JOIN w3_items i ON ac.current_id = i.id
      WHERE d.id_parent IS NOT NULL
        AND ac.depth < 100  -- Safety limit to prevent infinite loops
    ),
    -- Find the volume for each search result (the ancestor with itype=172)
    volume_ancestors AS (
      SELECT
        ac.original_id,
        ac.current_id as volume_id,
        ac.path_segment as full_path
      FROM ancestor_chain ac
      JOIN w3_items i ON ac.current_id = i.id
      WHERE i.itype = 172  -- Volume type
    )
    SELECT
      sr.id,
      sr.name,
      sr.itype,
      sr.file_name,
      sr.size,
      sr.date_change,
      sr.date_create,
      sr.id_parent,
      vi.volume_label,
      vi.root_path,
      va.full_path
    FROM search_results sr
    LEFT JOIN volume_ancestors va ON sr.id = va.original_id
    LEFT JOIN w3_volumeInfo vi ON va.volume_id = vi.id_item
    ORDER BY sr.name ASC
  `.trim();

  return { sql, params };
}
