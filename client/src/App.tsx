import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { StatusBar } from './components/StatusBar';
import { EmptyState } from './components/EmptyState';
import { search, getDbStatus, ApiError } from './services/api';
import type { DbStatusResponse, SearchResultItem } from './types/api';
import './App.css';

type AppState = 'initial' | 'loading' | 'results' | 'no-results' | 'error';

const PAGE_SIZE = 50;

/**
 * Parse search query into individual terms for highlighting
 * Handles quoted phrases and individual words
 */
function parseSearchTerms(query: string): string[] {
  const terms: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match;
  while ((match = regex.exec(query)) !== null) {
    // match[1] is quoted phrase, match[2] is unquoted word
    terms.push(match[1] || match[2]);
  }
  return terms;
}

function App() {
  // Search state
  const [appState, setAppState] = useState<AppState>('initial');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Database status state
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [dbStatusLoading, setDbStatusLoading] = useState(true);
  const [dbStatusError, setDbStatusError] = useState<string | null>(null);

  // Fetch database status on mount
  useEffect(() => {
    async function fetchDbStatus() {
      try {
        setDbStatusLoading(true);
        setDbStatusError(null);
        const status = await getDbStatus();
        setDbStatus(status);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to connect to database';
        setDbStatusError(message);
      } finally {
        setDbStatusLoading(false);
      }
    }

    fetchDbStatus();
  }, []);

  // Handle search submission
  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    setAppState('loading');
    setError(null);
    setResults([]);

    try {
      const response = await search({ query: searchQuery, limit: PAGE_SIZE });
      setResults(response.results);
      setTotalResults(response.totalResults);
      setExecutionTime(response.executionTime);

      if (response.results.length === 0) {
        setAppState('no-results');
      } else {
        setAppState('results');
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'An error occurred while searching';
      setError(message);
      setAppState('error');
    }
  }, []);

  // Handle clear (Esc key)
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalResults(0);
    setExecutionTime(0);
    setError(null);
    setAppState('initial');
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !query) return;

    setIsLoadingMore(true);
    try {
      const response = await search({
        query,
        limit: PAGE_SIZE,
        offset: results.length,
      });
      setResults((prev) => [...prev, ...response.results]);
    } catch (err) {
      // Silently fail on load more - user can try again
      console.error('Failed to load more results:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [query, results.length, isLoadingMore]);

  // Get search terms for highlighting
  const searchTerms = query ? parseSearchTerms(query) : [];

  // Check if there are more results to load
  const hasMore = results.length < totalResults;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">WebCatalog</h1>
        <p className="app-subtitle">Search your file catalog</p>
      </header>

      <main className="app-main">
        <div className="search-container">
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClear}
            isLoading={appState === 'loading'}
            initialQuery={query}
          />
        </div>

        <div className="results-container">
          {appState === 'initial' && <EmptyState type="initial" />}

          {appState === 'loading' && (
            <div className="loading-state" role="status" aria-live="polite">
              <div className="loading-spinner" aria-hidden="true" />
              <p>Searching...</p>
            </div>
          )}

          {appState === 'no-results' && (
            <EmptyState type="no-results" query={query} />
          )}

          {appState === 'error' && (
            <EmptyState type="error" errorMessage={error || undefined} />
          )}

          {appState === 'results' && (
            <SearchResults
              results={results}
              query={query}
              totalResults={totalResults}
              executionTime={executionTime}
              searchTerms={searchTerms}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <StatusBar
          dbStatus={dbStatus}
          isLoading={dbStatusLoading}
          error={dbStatusError}
        />
      </footer>
    </div>
  );
}

export default App;
