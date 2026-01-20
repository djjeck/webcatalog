import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { StatusBar } from './components/StatusBar';
import { EmptyState } from './components/EmptyState';
import { search, getDbStatus, ApiError } from './services/api';
import type { SearchResponse, DbStatusResponse } from './types/api';
import './App.css';

type AppState = 'initial' | 'loading' | 'results' | 'no-results' | 'error';

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
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

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

    try {
      const response = await search({ query: searchQuery });
      setSearchResponse(response);

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

  // Get search terms for highlighting
  const searchTerms = query ? parseSearchTerms(query) : [];

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

          {appState === 'results' && searchResponse && (
            <SearchResults
              results={searchResponse.results}
              query={searchResponse.query}
              totalResults={searchResponse.totalResults}
              executionTime={searchResponse.executionTime}
              searchTerms={searchTerms}
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
