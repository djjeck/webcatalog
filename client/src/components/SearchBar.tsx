import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

/**
 * SearchBar component with input field and submit button
 * Supports quoted phrase search syntax
 */
export function SearchBar({
  onSearch,
  isLoading = false,
  initialQuery = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmedQuery = query.trim();
      if (trimmedQuery) {
        onSearch(trimmedQuery);
      }
    },
    [query, onSearch]
  );

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const toggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search files and folders..."
          className="search-input"
          disabled={isLoading}
          aria-label="Search query"
        />
        <button
          type="submit"
          className="search-button"
          disabled={isLoading || !query.trim()}
          aria-label="Search"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          className="help-button"
          onClick={toggleHelp}
          aria-label="Toggle search help"
          aria-expanded={showHelp}
        >
          ?
        </button>
      </form>
      {showHelp && (
        <div className="search-help" role="tooltip">
          <h4>Search Syntax</h4>
          <ul>
            <li>
              <code>vacation</code> - Search for files containing "vacation"
            </li>
            <li>
              <code>vacation photos</code> - Search for files containing both
              "vacation" AND "photos"
            </li>
            <li>
              <code>"vacation photos"</code> - Search for exact phrase "vacation
              photos"
            </li>
            <li>
              <code>vacation "summer 2024"</code> - Mixed: "vacation" AND exact
              phrase "summer 2024"
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
