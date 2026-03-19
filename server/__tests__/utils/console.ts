import { vi, type MockInstance } from 'vitest';

export async function withExpectedConsoleError<T>(
  run: (consoleErrorSpy: MockInstance) => Promise<T> | T
): Promise<T> {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    return await run(consoleErrorSpy);
  } finally {
    consoleErrorSpy.mockRestore();
  }
}
