import { act } from 'react';
import userEvent from '@testing-library/user-event';

const DEFAULT_DEBOUNCE_WAIT_MS = 250;

export function setupDebouncedUser() {
  return userEvent.setup();
}

export async function flushDebounce(
  ms: number = DEFAULT_DEBOUNCE_WAIT_MS
): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
