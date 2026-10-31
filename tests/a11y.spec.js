// Automated accessibility suite: axe-core scans every page (including dynamic states)
// against WCAG 2.0/2.1/2.2 A and AA rules, then keyboard tests prove the behaviour
// that no static scanner can see.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const PAGES = ['/index.html', '/dialog.html', '/tabs.html', '/form-errors.html'];

/** Run axe and fail with a readable list of rule ids and selectors. */
async function expectNoViolations(page, include) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary, 'axe-core WCAG violations').toEqual([]);
}

test.describe('axe-core WCAG 2.2 AA scan', () => {
  for (const path of PAGES) {
    test(`${path} has no detectable violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  test('open dialog has no violations', async ({ page }) => {
    await page.goto('/dialog.html');
    await page.getByRole('button', { name: 'Delete project' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page, '#delete-dialog');
  });

  test('form in its error state has no violations', async ({ page }) => {
    await page.goto('/form-errors.html');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('#error-summary')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('modal dialog keyboard behaviour', () => {
  test('moves focus in, keeps it inside, and restores it on Escape', async ({ page }) => {
    await page.goto('/dialog.html');
    const trigger = page.locator('#open-delete');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Delete this project?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    // Tab through more times than there are controls: focus must never land on the trigger.
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      await expect(trigger).not.toBeFocused();
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('status')).toHaveText('Deletion cancelled.');
  });

  test('confirm button closes the dialog and announces the result', async ({ page }) => {
    await page.goto('/dialog.html');
    await page.locator('#open-delete').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('status')).toHaveText('Project deleted.');
    await expect(page.locator('#open-delete')).toBeFocused();
  });
});

test.describe('tabs keyboard behaviour', () => {
  test('arrow keys, Home and End move selection with a roving tabindex', async ({ page }) => {
    await page.goto('/tabs.html');
    const overview = page.getByRole('tab', { name: 'Overview' });
    const pricing = page.getByRole('tab', { name: 'Pricing' });
    const support = page.getByRole('tab', { name: 'Support' });

    await overview.focus();
    await page.keyboard.press('ArrowRight');
    await expect(pricing).toBeFocused();
    await expect(pricing).toHaveAttribute('aria-selected', 'true');
    await expect(pricing).toHaveAttribute('tabindex', '0');
    await expect(overview).toHaveAttribute('tabindex', '-1');
    await expect(page.getByRole('tabpanel', { name: 'Pricing' })).toBeVisible();
    await expect(page.locator('#panel-overview')).toBeHidden();

    await page.keyboard.press('End');
    await expect(support).toBeFocused();
    await page.keyboard.press('ArrowRight'); // wraps around
    await expect(overview).toBeFocused();
    await page.keyboard.press('ArrowLeft'); // wraps backwards
    await expect(support).toBeFocused();
    await page.keyboard.press('Home');
    await expect(overview).toHaveAttribute('aria-selected', 'true');

    // Tab leaves the tab list and lands in the active panel.
    await page.keyboard.press('Tab');
    await expect(page.locator('#panel-overview')).toBeFocused();
  });

  test('tab list structure is stable (ARIA snapshot)', async ({ page }) => {
    await page.goto('/tabs.html');
    await expect(page.getByRole('tablist')).toMatchAriaSnapshot(`
      - tablist "Plan details":
        - tab "Overview" [selected]
        - tab "Pricing"
        - tab "Support"
    `);
  });
});

test.describe('form error handling', () => {
  test('summary gets focus, fields are marked invalid and described', async ({ page }) => {
    await page.goto('/form-errors.html');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: 'Create account' }).click();

    const summary = page.locator('#error-summary');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole('link')).toHaveCount(3);
    await expect(page).toHaveTitle(/^Error: /);

    const email = page.getByLabel('Email address');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAccessibleDescription(
      'We only use this to send your receipt. Error: Enter an email address in the format name@example.com',
    );

    // Summary links move focus straight to the field.
    await summary.getByRole('link', { name: 'Enter a password' }).click();
    await expect(page.getByLabel('Password')).toBeFocused();
  });

  test('valid submission clears errors and announces success', async ({ page }) => {
    await page.goto('/form-errors.html');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.getByLabel('Full name').fill('Ada Lovelace');
    await page.getByLabel('Email address').fill('ada@example.com');
    await page.getByLabel('Password').fill('analytical-engine');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.locator('#error-summary')).toBeHidden();
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Account created');
  });
});
