import { describe, it, expect } from 'vitest';
import { withExpectedConsoleError } from '../utils/console.js';

describe('withExpectedConsoleError', () => {
  it('should suppress console.error during the callback and restore it after', async () => {
    const originalConsoleError = console.error;

    await withExpectedConsoleError((consoleErrorSpy) => {
      console.error('Expected test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Expected test error');
    });

    expect(console.error).toBe(originalConsoleError);
  });
});
