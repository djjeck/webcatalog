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
    const subPortions = isPhrase ? [portion] : portion.split(" ");
    for (const subPortion of subPortions) {
      if (subPortion !== '') {
        terms.push({value: subPortion, isPhrase});
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
 * Build SQL WHERE clause for search terms
 * Returns clause and parameters for prepared statement
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
    const pattern = buildLikePattern(term.value);
    params.push(pattern);

    // Search in both w3_items.name and w3_fileInfo.name
    conditions.push(
      `(w3_items.name LIKE ? COLLATE NOCASE OR w3_fileInfo.name LIKE ? COLLATE NOCASE)`
    );
    params.push(pattern); // Add pattern again for second column
  }

  // Combine all conditions with AND (all terms must match)
  const clause = conditions.join(' AND ');

  return { clause, params };
}

/**
 * Build complete search query SQL
 * Joins necessary tables and applies search conditions
 */
export function buildSearchQuery(searchString: string): {
  sql: string;
  params: string[];
} {
  const terms = parseSearchQuery(searchString);
  const { clause, params } = buildSearchWhereClause(terms);

  const sql = `
    SELECT
      w3_items.id,
      w3_items.name,
      w3_items.itype,
      w3_fileInfo.name as file_name,
      w3_fileInfo.size,
      w3_fileInfo.date_change,
      w3_fileInfo.date_create,
      w3_decent.id_parent,
      w3_volumeInfo.volume_label,
      w3_volumeInfo.root_path
    FROM w3_items
    LEFT JOIN w3_fileInfo ON w3_items.id = w3_fileInfo.id_item
    LEFT JOIN w3_decent ON w3_items.id = w3_decent.id_item
    LEFT JOIN w3_volumeInfo ON w3_items.id = w3_volumeInfo.id_item
    WHERE ${clause}
    ORDER BY w3_items.name ASC
  `.trim();

  return { sql, params };
}
