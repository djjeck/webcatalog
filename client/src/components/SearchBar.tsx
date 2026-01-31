import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

const DEBOUNCE_MS = 200;

export interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  onRandom?: () => void;
  initialQuery?: string;
}

/**
 * SearchBar component with live search and debouncing
 * Supports quoted phrase search syntax
 */
export function SearchBar({
  onSearch,
  onClear,
  onRandom,
  initialQuery = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autofocus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setQuery(newValue);

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const trimmedValue = newValue.trim();

      if (!trimmedValue) {
        // Clear immediately when empty
        onClear?.();
      } else {
        // Debounce search
        debounceRef.current = setTimeout(() => {
          onSearch(trimmedValue);
        }, DEBOUNCE_MS);
      }
    },
    [onSearch, onClear]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        // Clear debounce timer
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        setQuery('');
        onClear?.();
      }
    },
    [onClear]
  );

  return (
    <div className="search-bar">
      <div className="search-form">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search files and folders..."
          className="search-input"
          aria-label="Search query"
        />
        {onRandom && (
          <button
            type="button"
            className="random-button"
            onClick={onRandom}
            aria-label="Get a random result"
          >
            🎰
          </button>
        )}
      </div>
    </div>
  );
}
