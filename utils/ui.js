const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function firstVisibleLocator(page, locatorFactories, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const perTryTimeout = options.perTryTimeout ?? 2500;
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    for (const factory of locatorFactories) {
      const locator = factory(page).first();
      try {
        await locator.waitFor({ state: "visible", timeout: perTryTimeout });
        return locator;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(
    `No fallback locator became visible within ${timeoutMs}ms. Last error: ${lastError?.message || "unknown"}`
  );
}

async function clickFirstVisible(page, locatorFactories, options = {}) {
  const locator = await firstVisibleLocator(page, locatorFactories, options);
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  return locator;
}

async function fillFirstVisible(page, locatorFactories, value, options = {}) {
  const locator = await firstVisibleLocator(page, locatorFactories, options);
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await locator.fill("");
  await locator.fill(value);
  return locator;
}

async function highlightLocator(page, locator, border = "3px solid red") {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((el, borderStyle) => {
    el.setAttribute("data-playwright-prev-outline", el.style.outline || "");
    el.setAttribute("data-playwright-prev-outline-offset", el.style.outlineOffset || "");
    el.style.outline = borderStyle;
    el.style.outlineOffset = "2px";
  }, border);
}

async function screenshotStep(page, screenshotsDir, fileName) {
  ensureDir(screenshotsDir);
  const outPath = path.join(screenshotsDir, fileName);
  await page.screenshot({ path: outPath, fullPage: true });
  return outPath;
}

module.exports = {
  ensureDir,
  firstVisibleLocator,
  clickFirstVisible,
  fillFirstVisible,
  highlightLocator,
  screenshotStep,
};
