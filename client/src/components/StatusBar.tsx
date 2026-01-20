import type { DbStatusResponse } from '../types/api';
import { formatBytes, formatLastUpdated } from '../utils/format';

export interface StatusBarProps {
  dbStatus: DbStatusResponse | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * StatusBar component shows database status information
 */
export function StatusBar({ dbStatus, isLoading, error }: StatusBarProps) {
  if (isLoading) {
    return (
      <div className="status-bar status-bar-loading" role="status">
        <span className="status-indicator status-loading">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-bar status-bar-error" role="alert">
        <span className="status-indicator status-error">Disconnected</span>
        <span className="status-message">{error}</span>
      </div>
    );
  }

  if (!dbStatus) {
    return (
      <div className="status-bar status-bar-unknown" role="status">
        <span className="status-indicator status-unknown">Unknown</span>
      </div>
    );
  }

  const { connected, statistics, lastLoaded, fileSize } = dbStatus;

  return (
    <div
      className={`status-bar ${connected ? 'status-bar-connected' : 'status-bar-disconnected'}`}
      role="status"
    >
      <span
        className={`status-indicator ${connected ? 'status-connected' : 'status-disconnected'}`}
      >
        {connected ? 'Connected' : 'Disconnected'}
      </span>

      {connected && statistics && (
        <>
          <span className="status-item status-files">
            {statistics.totalFiles.toLocaleString()} files
          </span>
          <span className="status-item status-folders">
            {statistics.totalFolders.toLocaleString()} folders
          </span>
          <span className="status-item status-volumes">
            {statistics.totalVolumes.toLocaleString()} volumes
          </span>
          <span className="status-item status-size">
            DB: {formatBytes(fileSize, '0 B')}
          </span>
          <span className="status-item status-updated">
            Updated: {formatLastUpdated(lastLoaded)}
          </span>
        </>
      )}
    </div>
  );
}
