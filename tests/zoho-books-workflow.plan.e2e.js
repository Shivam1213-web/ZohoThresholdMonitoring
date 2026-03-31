/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  ensureDir,
  firstVisibleLocator,
  clickFirstVisible,
  fillFirstVisible,
  highlightLocator,
  screenshotStep,
} = require("../utils/ui");
const selectors = require("../utils/selectors");

const CONFIG = {
  baseUrl: process.env.ZOHO_BOOKS_URL || "https://books.zoho.com/",
  email: process.env.ZOHO_EMAIL || "unnatip@satvasolutions.com",
  password: process.env.ZOHO_PASSWORD || "Satva@121314#",
  functionName: process.env.ZOHO_FUNCTION_NAME || "Nexus Threshold Monitor Test",
  moduleName: process.env.ZOHO_FUNCTION_MODULE || "Invoices",
  scriptPath:
    process.env.ZOHO_DELUGE_SCRIPT ||
    "D:\\ZohoThreasholdMonitoring\\scripts\\nexus-threshold-monitor.deluge",
  screenshotsDir: path.resolve(__dirname, "../screenshots"),
  storageStatePath: process.env.STORAGE_STATE_PATH || path.resolve(__dirname, "../.auth/zoho-state.json"),
  saveStorageState: (process.env.SAVE_STORAGE_STATE || "false").toLowerCase() === "true",
  useStorageState: (process.env.USE_STORAGE_STATE || "false").toLowerCase() === "true",
  headless: (process.env.HEADLESS || "false").toLowerCase() === "true",
  debugMode: (process.env.DEBUG_MODE || "false").toLowerCase() === "true",
  gmailUrl: process.env.GMAIL_URL || "https://mail.google.com/",
  gmailSubjectKeyword: process.env.GMAIL_SUBJECT_KEYWORD || "Nexus Monitor",
  emailPollTimeoutMs: Number(process.env.EMAIL_POLL_TIMEOUT_MS || 120000),
};

function assertScriptExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deluge script not found at path: ${filePath}`);
  }
}

function timestampSuffix() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

async function maybePause(page, label) {
  if (CONFIG.debugMode) {
    console.log(`[debug] Pausing at ${label}`);
    await page.pause();
  }
}

async function waitForDashboard(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");
  await firstVisibleLocator(
    page,
    [(p) => p.locator("main,[role='main']").first(), (p) => p.locator("nav,aside,[role='navigation']").first()],
    { timeoutMs: 60000 }
  );
}

async function handlePostLoginState(page) {
  const continueSelectors = [
    (p) => p.getByRole("button", { name: /continue|proceed|open books|go to books/i }),
    (p) => p.getByRole("link", { name: /continue|proceed|open books|go to books/i }),
  ];
  try {
    const btn = await firstVisibleLocator(page, continueSelectors, { timeoutMs: 8000, perTryTimeout: 1200 });
    await btn.click();
  } catch (_error) {}

  const orgSelectors = [
    (p) => p.getByRole("button", { name: /organization|select/i }),
    (p) => p.getByRole("link", { name: /organization|select/i }),
    (p) => p.locator("[role='listitem'] button").first(),
    (p) => p.locator("[role='listitem'] a").first(),
  ];
  try {
    const org = await firstVisibleLocator(page, orgSelectors, { timeoutMs: 8000, perTryTimeout: 1200 });
    await org.click();
  } catch (_error) {}
}

async function handleFallbackSelectors(page, stepName, selectorFactories, options = {}) {
  const retries = options.retries ?? 3;
  const perTryTimeout = options.perTryTimeout ?? 2500;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    console.log(`[${stepName}] attempt ${attempt}/${retries}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    for (let i = 0; i < selectorFactories.length; i += 1) {
      const locator = selectorFactories[i](page).first();
      try {
        await locator.waitFor({ state: "visible", timeout: perTryTimeout });
        await locator.scrollIntoViewIfNeeded();
        console.log(`[${stepName}] selector ${i + 1} succeeded`);
        await locator.click();
        return locator;
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw new Error(`[${stepName}] Failed all selectors. Last error: ${lastError?.message || "unknown"}`);
}

async function clickAnyVisible(page, stepName, selectorFactories, perTryTimeout = 2500) {
  let lastError = null;
  for (let i = 0; i < selectorFactories.length; i += 1) {
    const locator = selectorFactories[i](page).first();
    try {
      await locator.waitFor({ state: "visible", timeout: perTryTimeout });
      await locator.scrollIntoViewIfNeeded();
      console.log(`[${stepName}] selector ${i + 1} succeeded`);
      await locator.click();
      return true;
    } catch (error) {
      lastError = error;
    }
  }
  console.log(`[${stepName}] no selector matched in this pass. Last: ${lastError?.message || "none"}`);
  return false;
}

async function login(page) {
  console.log("[login] Opening Zoho Books");
  await page.goto(CONFIG.baseUrl, { waitUntil: "domcontentloaded" });

  try {
    await clickFirstVisible(page, [
      (p) => p.getByRole("link", { name: /sign in/i }),
      (p) => p.getByRole("button", { name: /sign in/i }),
      (p) => p.getByText(/sign in/i),
    ]);
  } catch (_error) {}

  const emailInput = await firstVisibleLocator(page, [
    (p) => p.getByLabel(/email/i),
    (p) => p.getByPlaceholder(/email/i),
    (p) => p.locator("input[type='email']"),
  ]);
  await emailInput.fill(CONFIG.email);

  try {
    await clickFirstVisible(page, [
      (p) => p.getByRole("button", { name: /next|continue|sign in/i }),
      (p) => p.locator("button[type='submit']"),
    ]);
  } catch (_error) {}

  const passwordInput = await firstVisibleLocator(page, [
    (p) => p.getByLabel(/password/i),
    (p) => p.getByPlaceholder(/password/i),
    (p) => p.locator("input[type='password']"),
  ]);
  await passwordInput.fill(CONFIG.password);

  await clickFirstVisible(page, [
    (p) => p.getByRole("button", { name: /sign in|login|continue/i }),
    (p) => p.locator("button[type='submit']"),
    (p) => p.locator("input[type='submit']"),
  ]);

  await page.waitForURL(/zoho\.com|books\.zoho\.com/i, { timeout: 90000 });
  await handlePostLoginState(page);
  await waitForDashboard(page);
  await screenshotStep(page, CONFIG.screenshotsDir, "01_dashboard.png");
  await maybePause(page, "post-login");
}

async function ensureZohoSession(page) {
  if (!CONFIG.useStorageState || !fs.existsSync(CONFIG.storageStatePath)) {
    await login(page);
    return;
  }
  console.log(`[auth] Using storage state ${CONFIG.storageStatePath}`);
  await page.goto(CONFIG.baseUrl, { waitUntil: "domcontentloaded" });
  await handlePostLoginState(page);
  await waitForDashboard(page);
  await screenshotStep(page, CONFIG.screenshotsDir, "01_dashboard.png");
}

async function maybeSaveStorageState(context) {
  if (!CONFIG.saveStorageState) return;
  ensureDir(path.dirname(CONFIG.storageStatePath));
  await context.storageState({ path: CONFIG.storageStatePath });
}

async function navigateToSettings(page) {
  await waitForDashboard(page);
  await screenshotStep(page, CONFIG.screenshotsDir, "settings_before_click.png");

  // Path A: direct settings icon/button
  const directSettingsSelectors = [
    (p) => p.getByRole("button", { name: /^settings$/i }),
    (p) => p.getByRole("link", { name: /^settings$/i }),
    (p) => p.getByRole("button", { name: /settings/i }),
    (p) => p.getByRole("link", { name: /settings/i }),
    (p) => p.locator("button[aria-label*='settings' i]"),
    (p) => p.locator("a[aria-label*='settings' i]"),
    (p) => p.locator("[data-tooltip*='settings' i]"),
    (p) => p.locator("[title*='settings' i]"),
    (p) => p.locator("header button").filter({ has: p.locator("svg") }).nth(2),
  ];

  // Path B: open org/profile menu then click settings item
  const openMenuSelectors = [
    (p) => p.getByRole("button", { name: /satva|demo|company|organization|profile|account/i }),
    (p) => p.getByRole("link", { name: /satva|demo|company|organization|profile|account/i }),
    (p) => p.locator("header [aria-haspopup='menu']").first(),
    (p) => p.locator("header button").last(),
  ];
  const menuSettingsSelectors = [
    (p) => p.getByRole("menuitem", { name: /settings/i }),
    (p) => p.getByRole("link", { name: /settings/i }),
    (p) => p.getByRole("button", { name: /settings/i }),
    (p) => p.getByText(/^settings$/i),
    (p) => p.getByText(/settings/i),
  ];

  try {
    let clicked = false;
    for (let attempt = 1; attempt <= 4 && !clicked; attempt += 1) {
      console.log(`[navigateToSettings] attempt ${attempt}/4`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForLoadState("networkidle");

      clicked = await clickAnyVisible(page, "settingsDirectPath", directSettingsSelectors, 2500);
      if (clicked) {
        break;
      }

      const opened = await clickAnyVisible(page, "settingsMenuOpenPath", openMenuSelectors, 2000);
      if (opened) {
        clicked = await clickAnyVisible(page, "settingsMenuItemPath", menuSettingsSelectors, 2500);
      }
    }

    if (!clicked) {
      throw new Error("Could not find settings via direct icon or profile/org menu path.");
    }
  } catch (error) {
    await screenshotStep(page, CONFIG.screenshotsDir, "settings_error.png");
    throw new Error(`Settings not found/clickable. ${error.message}`);
  }
  await page.waitForLoadState("networkidle");
  await screenshotStep(page, CONFIG.screenshotsDir, "settings_after_click.png");
}

async function navigateToCustomFunctions(page) {
  await navigateToSettings(page);
  await handleFallbackSelectors(page, "navigateToAutomation", selectors.automationSelectors(), {
    retries: 3,
    perTryTimeout: 3000,
  });
  await handleFallbackSelectors(page, "navigateToCustomFunctions", selectors.customFunctionsSelectors(), {
    retries: 3,
    perTryTimeout: 3000,
  });
  await page.waitForLoadState("networkidle");
  await screenshotStep(page, CONFIG.screenshotsDir, "02_custom_functions_page.png");
}

async function chooseModule(page, moduleName) {
  const moduleField = await firstVisibleLocator(page, selectors.moduleFieldSelectors(), {
    timeoutMs: 20000,
  });
  const tagName = await moduleField.evaluate((el) => el.tagName.toLowerCase());
  if (tagName === "select") {
    await moduleField.selectOption({ label: moduleName });
    return moduleField;
  }
  await moduleField.click();
  const option = await firstVisibleLocator(page, [
    (p) => p.getByRole("option", { name: new RegExp(`^${moduleName}$`, "i") }),
    (p) => p.getByText(new RegExp(`^${moduleName}$`, "i")),
  ]);
  await option.click();
  return moduleField;
}

async function setCodeEditorContent(page, content) {
  const aceInput = page.locator(".ace_text-input").first();
  if (await aceInput.isVisible().catch(() => false)) {
    await aceInput.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(content);
    return page.locator(".ace_editor").first();
  }
  const textAreaEditor = page.locator("textarea").first();
  if (await textAreaEditor.isVisible().catch(() => false)) {
    await textAreaEditor.fill("");
    await textAreaEditor.fill(content);
    return textAreaEditor;
  }
  const contentEditable = page.locator('[contenteditable="true"]').first();
  if (await contentEditable.isVisible().catch(() => false)) {
    await contentEditable.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(content);
    return contentEditable;
  }
  throw new Error("Could not detect script editor.");
}

async function createFunction(page) {
  const scriptBody = fs.readFileSync(CONFIG.scriptPath, "utf8");
  await clickFirstVisible(page, selectors.newCustomFunctionSelectors(), { timeoutMs: 25000 });
  const nameInput = await fillFirstVisible(page, selectors.functionNameInputSelectors(), CONFIG.functionName);
  const moduleField = await chooseModule(page, CONFIG.moduleName);
  await highlightLocator(page, nameInput);
  await highlightLocator(page, moduleField);
  await screenshotStep(page, CONFIG.screenshotsDir, "03_new_function_form.png");
  const editorElement = await setCodeEditorContent(page, scriptBody);
  await highlightLocator(page, editorElement);
  await screenshotStep(page, CONFIG.screenshotsDir, "04_script_pasted.png");
  await clickFirstVisible(page, selectors.saveButtonSelectors(), { timeoutMs: 20000 });
  await firstVisibleLocator(page, [(p) => p.getByText(/saved|success|updated|created/i), (p) => p.locator('[class*="success" i]')]);
  await screenshotStep(page, CONFIG.screenshotsDir, "05_function_saved.png");
}

async function setDateFieldToday(page, labelRegex, placeholderRegex) {
  const today = new Date();
  const dateText = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(
    2,
    "0"
  )}/${today.getFullYear()}`;
  const dateInput = await firstVisibleLocator(page, [
    (p) => p.getByLabel(labelRegex),
    (p) => p.getByPlaceholder(placeholderRegex),
    (p) => p.locator('input[name*="date" i]'),
  ]);
  await dateInput.fill("");
  await dateInput.fill(dateText);
  return dateInput;
}

async function createDemoVendors(page, runTag) {
  const vendorA = `DemoVendorA_${runTag}`;
  const vendorB = `DemoVendorB_${runTag}`;
  const vendorDefs = [
    { name: vendorA, email: `demovendor.a.${runTag}@example.com`, screenshot: "06_vendor_a_created.png" },
    { name: vendorB, email: `demovendor.b.${runTag}@example.com`, screenshot: "07_vendor_b_created.png" },
  ];

  await handleFallbackSelectors(
    page,
    "openVendors",
    [
      (p) => p.getByRole("link", { name: /purchases|contacts|vendors/i }),
      (p) => p.getByRole("button", { name: /purchases|contacts|vendors/i }),
      (p) => p.getByText(/vendors/i),
    ],
    { retries: 4, perTryTimeout: 2500 }
  );

  for (const vendor of vendorDefs) {
    await handleFallbackSelectors(
      page,
      "newVendor",
      [
        (p) => p.getByRole("button", { name: /new vendor|new contact|new/i }),
        (p) => p.getByText(/new vendor|new contact/i),
      ],
      { retries: 3, perTryTimeout: 3000 }
    );

    const nameField = await fillFirstVisible(
      page,
      [
        (p) => p.getByLabel(/vendor name|display name|name/i),
        (p) => p.getByPlaceholder(/vendor name|display name|name/i),
        (p) => p.locator('input[name*="name" i]').first(),
      ],
      vendor.name,
      { timeoutMs: 20000 }
    );

    try {
      await fillFirstVisible(
        page,
        [
          (p) => p.getByLabel(/email/i),
          (p) => p.getByPlaceholder(/email/i),
          (p) => p.locator('input[type="email"]').first(),
        ],
        vendor.email,
        { timeoutMs: 6000 }
      );
    } catch (_error) {}

    await highlightLocator(page, nameField);
    await clickFirstVisible(page, selectors.saveButtonSelectors(), { timeoutMs: 20000 });
    await firstVisibleLocator(page, [(p) => p.getByText(/saved|created|success/i), (p) => p.locator('[class*="success" i]')]);
    await screenshotStep(page, CONFIG.screenshotsDir, vendor.screenshot);
  }

  return { vendorA, vendorB };
}

async function createDemoInvoice(page, runTag) {
  const customerName = `Demo Customer ${runTag}`;
  const itemName = `Test Item ${runTag}`;

  await clickFirstVisible(page, selectors.salesMenuSelectors(), { timeoutMs: 20000 });
  await clickFirstVisible(page, selectors.invoicesMenuSelectors(), { timeoutMs: 20000 });
  await clickFirstVisible(page, selectors.newInvoiceSelectors(), { timeoutMs: 25000 });

  const customerField = await fillFirstVisible(
    page,
    [
      (p) => p.getByLabel(/customer name|customer/i),
      (p) => p.getByPlaceholder(/customer name|search customer/i),
      (p) => p.locator('input[name*="customer" i]'),
      (p) => p.locator('[role="combobox"][aria-label*="customer" i]'),
    ],
    customerName
  );

  const invoiceDateField = await setDateFieldToday(page, /invoice date/i, /invoice date|mm\/dd\/yyyy/i);
  const itemField = await fillFirstVisible(
    page,
    [
      (p) => p.getByLabel(/item name|item/i),
      (p) => p.getByPlaceholder(/item/i),
      (p) => p.locator('input[name*="item" i]').first(),
      (p) => p.locator('[role="combobox"][aria-label*="item" i]').first(),
    ],
    itemName
  );
  const rateField = await fillFirstVisible(
    page,
    [
      (p) => p.getByLabel(/^rate$/i),
      (p) => p.getByPlaceholder(/rate/i),
      (p) => p.locator('input[name*="rate" i]').first(),
      (p) => p.locator('td[aria-label*="rate" i] input').first(),
    ],
    "100"
  );

  await highlightLocator(page, customerField);
  await highlightLocator(page, invoiceDateField);
  await highlightLocator(page, itemField);
  await highlightLocator(page, rateField);
  await screenshotStep(page, CONFIG.screenshotsDir, "08_invoice_form.png");

  await clickFirstVisible(page, [(p) => p.getByRole("button", { name: /^save$/i }), (p) => p.getByRole("button", { name: /save/i })], {
    timeoutMs: 20000,
  });
  await firstVisibleLocator(page, [(p) => p.getByText(/invoice.*created|saved|updated|success/i), (p) => p.locator('[class*="success" i]')]);
  await screenshotStep(page, CONFIG.screenshotsDir, "09_invoice_saved.png");
  return { customerName, itemName };
}

async function recordInvoicePayment(page) {
  await handleFallbackSelectors(
    page,
    "recordPayment",
    [(p) => p.getByRole("button", { name: /record payment|payment received/i }), (p) => p.getByText(/record payment|payment received/i)],
    { retries: 3, perTryTimeout: 3000 }
  );

  try {
    await setDateFieldToday(page, /payment date/i, /payment date|mm\/dd\/yyyy/i);
  } catch (_error) {}

  try {
    await fillFirstVisible(
      page,
      [(p) => p.getByLabel(/amount received|amount/i), (p) => p.getByPlaceholder(/amount/i), (p) => p.locator('input[name*="amount" i]').first()],
      "100",
      { timeoutMs: 6000 }
    );
  } catch (_error) {}

  await clickFirstVisible(page, [(p) => p.getByRole("button", { name: /^save$/i }), (p) => p.getByRole("button", { name: /save/i })], {
    timeoutMs: 20000,
  });
  await firstVisibleLocator(page, [(p) => p.getByText(/paid|payment.*recorded|success/i), (p) => p.locator('[class*="success" i]')]);
  await screenshotStep(page, CONFIG.screenshotsDir, "10_payment_recorded.png");
}

async function executeFunctionAndValidateLog(page) {
  await navigateToCustomFunctions(page);
  const functionRow = await firstVisibleLocator(page, [
    (p) => p.getByRole("link", { name: new RegExp(CONFIG.functionName, "i") }),
    (p) => p.getByText(new RegExp(CONFIG.functionName, "i")),
  ]);
  await functionRow.click();

  await clickFirstVisible(page, [
    (p) => p.getByRole("button", { name: /execute|run|test/i }),
    (p) => p.getByText(/execute|run/i),
  ]);

  const marker = await firstVisibleLocator(page, [
    (p) => p.getByText(/execution|completed|success|log|info/i),
    (p) => p.locator("pre").first(),
  ]);
  const markerText = ((await marker.textContent()) || "").trim();
  await screenshotStep(page, CONFIG.screenshotsDir, "11_function_executed_log.png");
  return markerText;
}

async function verifyGmailAlert(page) {
  await page.goto(CONFIG.gmailUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await maybePause(page, "gmail-auth");

  const query = `subject:(${CONFIG.gmailSubjectKeyword}) newer_than:2d`;
  const deadline = Date.now() + CONFIG.emailPollTimeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const searchBox = await firstVisibleLocator(page, [
        (p) => p.getByRole("textbox", { name: /search mail|search in mail/i }),
        (p) => p.locator('input[aria-label*="Search mail" i]'),
      ]);
      await searchBox.fill("");
      await searchBox.fill(query);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");

      const row = await firstVisibleLocator(page, [
        (p) => p.locator("tr.zA").first(),
        (p) => p.getByText(new RegExp(CONFIG.gmailSubjectKeyword, "i")).first(),
      ]);
      await screenshotStep(page, CONFIG.screenshotsDir, "12_gmail_inbox_alert.png");
      await row.click();

      const body = await firstVisibleLocator(page, [
        (p) => p.locator("div.a3s").first(),
        (p) => p.getByText(/Nexus|Threshold|Sales Tax/i).first(),
      ]);
      const bodyText = ((await body.textContent()) || "").trim();
      await screenshotStep(page, CONFIG.screenshotsDir, "13_gmail_alert_opened.png");
      return { found: true, bodyText };
    } catch (error) {
      lastError = error;
      await page.waitForLoadState("networkidle");
    }
  }
  throw new Error(`Gmail alert not found. Last error: ${lastError?.message || "unknown"}`);
}

async function run() {
  assertScriptExists(CONFIG.scriptPath);
  ensureDir(CONFIG.screenshotsDir);
  const runTag = timestampSuffix();
  const summary = {
    runTag,
    vendors: {},
    invoice: {},
    executionMarker: "",
    gmail: {},
    screenshotsDir: CONFIG.screenshotsDir,
  };

  const browser = await chromium.launch({ headless: CONFIG.headless, slowMo: CONFIG.debugMode ? 150 : 0 });
  const contextOptions = { viewport: { width: 1600, height: 900 } };
  if (CONFIG.useStorageState && fs.existsSync(CONFIG.storageStatePath)) {
    contextOptions.storageState = CONFIG.storageStatePath;
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    await ensureZohoSession(page);
    await navigateToCustomFunctions(page);
    await createFunction(page);
    summary.vendors = await createDemoVendors(page, runTag);
    summary.invoice = await createDemoInvoice(page, runTag);
    await recordInvoicePayment(page);
    summary.executionMarker = await executeFunctionAndValidateLog(page);
    summary.gmail = await verifyGmailAlert(page);
    await maybeSaveStorageState(context);
    console.log(`[summary] ${JSON.stringify(summary, null, 2)}`);
  } catch (error) {
    console.error(`[fatal] ${error.message}`);
    await screenshotStep(page, CONFIG.screenshotsDir, "error.png");
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch(() => {
  process.exitCode = 1;
});
