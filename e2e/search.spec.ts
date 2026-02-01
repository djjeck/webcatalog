import { test, expect } from '@playwright/test';

test.describe('Page load', () => {
  test('should show search input, initial state, and connected status', async ({
    page,
  }) => {
    await page.goto('/');

    // Search input is visible
    const input = page.getByPlaceholder('Search files and folders...');
    await expect(input).toBeVisible();

    // Initial empty state
    await expect(page.getByText('Search Your Catalog')).toBeVisible();

    // Database status loads and shows connected
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Search and view results', () => {
  test('should find results when typing a query', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

    const input = page.getByPlaceholder('Search files and folders...');
    await input.fill('config');

    // Wait for debounced search to complete and results to appear
    await expect(page.getByText('results found')).toBeVisible({
      timeout: 5_000,
    });

    // Should find 3 results: root_1/config, root_2/config, root_1/.config
    await expect(page.getByText('3 results found')).toBeVisible();

    // Result items should show file names
    await expect(page.getByText('config').first()).toBeVisible();
  });

  test('should highlight search terms in results', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

    const input = page.getByPlaceholder('Search files and folders...');
    await input.fill('secret');

    await expect(page.getByText('1 result found')).toBeVisible({
      timeout: 5_000,
    });

    // The search term should be highlighted with a <mark> element
    const mark = page.locator('mark');
    await expect(mark.first()).toBeVisible();
    await expect(mark.first()).toHaveText('secret');
  });
});

test.describe('No results', () => {
  test('should show no results message for non-matching query', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

    const input = page.getByPlaceholder('Search files and folders...');
    await input.fill('nonexistent_xyz_file_12345');

    await expect(page.getByText('No Results Found')).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Clear search with Escape', () => {
  test('should clear input and return to initial state on Escape', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

    const input = page.getByPlaceholder('Search files and folders...');
    await input.fill('config');

    await expect(page.getByText('3 results found')).toBeVisible({
      timeout: 5_000,
    });

    // Press Escape
    await input.press('Escape');

    // Should return to initial state
    await expect(page.getByText('Search Your Catalog')).toBeVisible();
    await expect(input).toHaveValue('');
  });
});

test.describe('Random button', () => {
  test('should display a random result when clicked', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

    const randomButton = page.getByRole('button', {
      name: 'Get a random result',
    });
    await randomButton.click();

    await expect(page.getByText('1 result found')).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Quoted phrase search', () => {
  test('should find file with spaces using quoted phrase', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10_000 });

    const input = page.getByPlaceholder('Search files and folders...');
    await input.fill('"file with spaces"');

    await expect(page.getByText('1 result found')).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.locator('.result-item-name', { hasText: 'file with spaces.log' })
    ).toBeVisible();
  });
});
