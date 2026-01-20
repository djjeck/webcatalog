export type EmptyStateType = 'initial' | 'no-results' | 'error';

export interface EmptyStateProps {
  type: EmptyStateType;
  query?: string;
  errorMessage?: string;
}

/**
 * EmptyState component displays placeholder content
 * when there's no data to show
 */
export function EmptyState({ type, query, errorMessage }: EmptyStateProps) {
  switch (type) {
    case 'initial':
      return (
        <div className="empty-state empty-state-initial" role="status">
          <div className="empty-state-icon" aria-hidden="true">
            🔍
          </div>
          <h2 className="empty-state-title">Search Your Catalog</h2>
          <p className="empty-state-message">
            Enter a search term above to find files and folders in your catalog.
          </p>
          <div className="empty-state-hints">
            <p>Tips:</p>
            <ul>
              <li>
                Use quotes for exact phrases: <code>"vacation photos"</code>
              </li>
              <li>
                Multiple words are combined with AND:{' '}
                <code>vacation summer</code>
              </li>
            </ul>
          </div>
        </div>
      );

    case 'no-results':
      return (
        <div className="empty-state empty-state-no-results" role="status">
          <div className="empty-state-icon" aria-hidden="true">
            📭
          </div>
          <h2 className="empty-state-title">No Results Found</h2>
          <p className="empty-state-message">
            No files or folders match{' '}
            {query ? (
              <>
                "<strong>{query}</strong>"
              </>
            ) : (
              'your search'
            )}
            .
          </p>
          <div className="empty-state-hints">
            <p>Suggestions:</p>
            <ul>
              <li>Check your spelling</li>
              <li>Try different keywords</li>
              <li>Use fewer search terms</li>
              <li>Remove quotes if searching for an exact phrase</li>
            </ul>
          </div>
        </div>
      );

    case 'error':
      return (
        <div className="empty-state empty-state-error" role="alert">
          <div className="empty-state-icon" aria-hidden="true">
            ⚠️
          </div>
          <h2 className="empty-state-title">Something Went Wrong</h2>
          <p className="empty-state-message">
            {errorMessage ||
              'An error occurred while searching. Please try again.'}
          </p>
          <div className="empty-state-hints">
            <p>You can try:</p>
            <ul>
              <li>Refreshing the page</li>
              <li>Checking your network connection</li>
              <li>Waiting a moment and trying again</li>
            </ul>
          </div>
        </div>
      );

    default:
      return null;
  }
}
