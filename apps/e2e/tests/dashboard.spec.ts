import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL ?? 'admin@example.com';
const PASS = process.env.TEST_PASSWORD ?? 'password';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|projects)/);
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
  });

  test('shows dashboard with stat cards', async ({ page }) => {
    await expect(page.getByText(/active projects/i)).toBeVisible();
    await expect(page.getByText(/in progress tasks/i)).toBeVisible();
  });

  test('shows team view tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /team view/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /my work/i })).toBeVisible();
  });

  test('can switch to my work tab', async ({ page }) => {
    await page.getByRole('tab', { name: /my work/i }).click();
    await expect(page.getByText(/my open tasks/i)).toBeVisible();
  });

  test('sidebar navigation links work', async ({ page }) => {
    await page.getByRole('link', { name: /projects/i }).first().click();
    await expect(page).toHaveURL(/\/projects/);
  });
});
