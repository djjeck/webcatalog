import type { SearchResultItem } from '../types/api';
import { formatFileSize, formatDate, highlightTerms } from '../utils/format';

export interface ResultItemProps {
  item: SearchResultItem;
  searchTerms?: string[];
}

/**
 * Get icon for item type
 */
function getTypeIcon(type: 'file' | 'folder' | 'volume'): string {
  switch (type) {
    case 'folder':
      return '📁';
    case 'volume':
      return '💾';
    case 'file':
    default:
      return '📄';
  }
}

/**
 * ResultItem component displays a single search result
 */
export function ResultItem({ item, searchTerms = [] }: ResultItemProps) {
  const fullPath =
    item.volumePath && item.path
      ? `${item.volumePath}${item.path}`
      : item.path || item.name;

  return (
    <div
      className={`result-item result-item-${item.type}`}
      data-testid="result-item"
    >
      <div className="result-item-icon" aria-hidden="true">
        {getTypeIcon(item.type)}
      </div>
      <div className="result-item-content">
        <div className="result-item-name">
          {highlightTerms(item.name, searchTerms)}
        </div>
        <div className="result-item-path" title={fullPath}>
          {highlightTerms(fullPath, searchTerms)}
        </div>
        <div className="result-item-meta">
          {item.type === 'file' && (
            <span className="result-item-size">
              {formatFileSize(item.size)}
            </span>
          )}
          {item.dateModified && (
            <span className="result-item-date">
              Modified: {formatDate(item.dateModified)}
            </span>
          )}
          {item.volumeLabel && (
            <span className="result-item-volume">
              Volume: {item.volumeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
