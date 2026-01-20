import type { SearchResultItem } from '../types/api';
import { ResultItem } from './ResultItem';

export interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
  totalResults: number;
  executionTime: number;
  searchTerms?: string[];
}

/**
 * SearchResults component displays a list of search results
 */
export function SearchResults({
  results,
  query,
  totalResults,
  executionTime,
  searchTerms = [],
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="search-results search-results-empty">
        <p className="no-results-message">
          No results found for "<strong>{query}</strong>"
        </p>
        <p className="no-results-hint">
          Try different search terms or use quotes for exact phrases.
        </p>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="search-results-header">
        <span className="results-count">
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </span>
        <span className="results-time">({executionTime.toFixed(0)}ms)</span>
      </div>
      <div className="search-results-list">
        {results.map((item) => (
          <ResultItem key={item.id} item={item} searchTerms={searchTerms} />
        ))}
      </div>
    </div>
  );
}
