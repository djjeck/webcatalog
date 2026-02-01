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
  const fullPath = item.path || item.name;

  return (
    <div
      className={`result-item result-item-${item.type}`}
      data-testid="result-item"
    >
      <div className="result-item-content">
        <div className="result-item-name">
          <span className="result-item-icon" aria-hidden="true">
            {getTypeIcon(item.type)}
          </span>
          {highlightTerms(item.name, searchTerms)}
        </div>
        <div className="result-item-path" title={fullPath}>
          {highlightTerms(fullPath, searchTerms)}
        </div>
        <div className="result-item-meta">
          <span className="result-item-size">{formatFileSize(item.size)}</span>
          {item.dateModified && (
            <span className="result-item-date">
              Modified: {formatDate(item.dateModified)}
            </span>
          )}
        </div>
        {item.volumeName && (
          <div className="result-item-volume-badge" title={item.volumeName}>
            <span className="volume-badge-icon" aria-hidden="true">
              📦
            </span>
            {item.volumeName}
          </div>
        )}
      </div>
    </div>
  );
}
