import { expect, type Page } from "@playwright/test";

export async function openExploreFilters(page: Page): Promise<void> {
  const toggle = page
    .getByRole("button", { name: /open filters|close filters/i })
    .first();
  await expect(toggle).toBeVisible({ timeout: 10_000 });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(
    page.getByRole("dialog", { name: "Explore filters" })
  ).toBeVisible({ timeout: 5_000 });
}

export function exploreFilterTypeChip(page: Page, label: string) {
  return page.getByTestId("explore-filter-type").filter({ hasText: label });
}

export async function selectFeedTypeFilter(
  page: Page,
  label: string
): Promise<void> {
  await openExploreFilters(page);
  const chip = exploreFilterTypeChip(page, label);
  await expect(chip).toBeVisible({ timeout: 5_000 });
  await chip.click();
}

export async function setLanguageFilter(
  page: Page,
  value: string
): Promise<void> {
  await openExploreFilters(page);
  await page.locator("#explore-lang-overlay").fill(value);
}

export async function setCountryFilter(
  page: Page,
  value: string
): Promise<void> {
  await openExploreFilters(page);
  await page.locator("#explore-country-overlay").fill(value);
}

export function discoverTagRow(page: Page) {
  return page.locator(".hide__scrollbar").filter({
    has: page.getByRole("button", { name: "Concert", exact: true }),
  });
}
