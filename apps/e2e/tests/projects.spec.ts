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

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('shows projects list page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
  });

  test('can open new project dialog', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/create project/i)).toBeVisible();
  });

  test('creates a new project', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: /new project/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/title/i).fill('E2E Test Project');
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByText('E2E Test Project')).toBeVisible({ timeout: 8000 });
  });
});
