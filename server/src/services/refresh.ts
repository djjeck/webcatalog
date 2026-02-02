/**
 * Database refresh service for WinCatalog database
 * Handles on-demand refresh, file watching, and scheduled hourly refresh
 */

import { watch, type FSWatcher } from 'fs';
import cron from 'node-cron';
import { getDatabase } from '../db/database.js';

/**
 * File system watcher for proactive reload
 */
let fileWatcher: FSWatcher | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Scheduled task reference for cleanup
 */
let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Last reload timestamp for tracking
 */
let lastReloadTime: Date | null = null;

/**
 * Check if database file has changed and reload if necessary
 * Returns true if database was reloaded
 */
export async function checkAndReloadIfChanged(): Promise<boolean> {
  const dbManager = getDatabase();
  const reloaded = await dbManager.reloadIfChanged();

  if (reloaded) {
    lastReloadTime = new Date();
    console.log(`Database reloaded at ${lastReloadTime.toISOString()}`);
  }

  return reloaded;
}

/**
 * Get the last reload timestamp
 */
export function getLastReloadTime(): Date | null {
  return lastReloadTime;
}

/**
 * Schedule hourly database refresh as a safety net.
 * Since checkAndReloadIfChanged only stats the file, this is very cheap
 * when nothing has changed. Catches cases where fs.watch misses events
 * (e.g. network filesystems, Docker volume mounts).
 */
export function scheduleHourlyRefresh(): void {
  // Stop any existing scheduled task
  stopScheduledRefresh();

  scheduledTask = cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled hourly refresh check');
    try {
      await checkAndReloadIfChanged();
    } catch (error) {
      console.error('Error during scheduled refresh:', error);
    }
  });

  console.log('Scheduled hourly refresh check (cron: 0 * * * *)');
}

/**
 * Stop the scheduled refresh task
 */
export function stopScheduledRefresh(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Scheduled refresh stopped');
  }
}

/**
 * Check if a scheduled refresh is active
 */
export function isScheduledRefreshActive(): boolean {
  return scheduledTask !== null;
}

/**
 * Start watching the database file for changes.
 * When a change is detected, proactively reload the database so that
 * subsequent searches don't block waiting for a rebuild.
 */
export function startWatching(dbPath: string): void {
  // Clear the previous watcher, if present.
  stopWatching();

  fileWatcher = watch(dbPath, () => {
    // Debounce: wait 500ms after the last change event before reloading,
    // since file writes may trigger multiple rapid events.
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      console.log('File change detected, reloading database...');
      checkAndReloadIfChanged().catch((error) => {
        console.error('Error during file-watch reload:', error);
      });
    }, 500);
  });

  console.log(`Watching database file for changes: ${dbPath}`);
}

/**
 * Stop watching the database file
 */
export function stopWatching(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

/**
 * Check if file watching is active
 */
export function isWatching(): boolean {
  return fileWatcher !== null;
}

/**
 * Reset internal state (useful for testing)
 */
export function resetRefreshState(): void {
  stopScheduledRefresh();
  stopWatching();
  lastReloadTime = null;
}
