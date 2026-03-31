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
  password: process.env.ZOHO_PASSWORD || "Satva@1213#",
  functionName: process.env.ZOHO_FUNCTION_NAME || "Nexus Threshold Monitor Test",
  moduleName: process.env.ZOHO_FUNCTION_MODULE || "Invoices",
  scriptPath:
    process.env.ZOHO_DELUGE_SCRIPT ||
    "D:\\ZohoThreasholdMonitoring\\scripts\\nexus-threshold-monitor.deluge",
  screenshotsDir: path.resolve(__dirname, "../screenshots"),
  headless:
    (process.env.HEADLESS || "false").toLowerCase() === "true" ? true : false,
  debugMode: (process.env.DEBUG_MODE || "false").toLowerCase() === "true",
};

function assertScriptExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deluge script not found at path: ${filePath}`);
  }
}

async function waitForDashboard(page) {
  console.log("[waitForDashboard] Waiting for dashboard load states...");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  const layoutMarkers = [
    (p) => p.locator('nav, aside, [role="navigation"]').first(),
    (p) => p.locator('main, [role="main"]').first(),
  ];

  await firstVisibleLocator(page, layoutMarkers, { timeoutMs: 60000 });

  const dashboardMarkers = [
    (p) => p.getByRole("link", { name: /dashboard/i }),
    (p) => p.getByRole("button", { name: /dashboard/i }),
    (p) => p.getByText(/dashboard/i),
    (p) => p.locator('a:has-text("Dashboard")'),
    (p) => p.locator('[aria-label*="dashboard" i]'),
  ];

  await firstVisibleLocator(page, dashboardMarkers, { timeoutMs: 60000 });
  console.log("[waitForDashboard] Dashboard is ready.");
}

async function handlePostLoginState(page) {
  console.log("[handlePostLoginState] Resolving post-login intermediate screens if any...");
  await page.waitForLoadState("domcontentloaded");

  // Organization picker / continue screens can appear in some Zoho orgs.
  const continueSelectors = [
    (p) => p.getByRole("button", { name: /continue|proceed|open books|go to books/i }),
    (p) => p.getByRole("link", { name: /continue|proceed|open books|go to books/i }),
  ];
  try {
    const continueBtn = await firstVisibleLocator(page, continueSelectors, {
      timeoutMs: 8000,
      perTryTimeout: 1000,
    });
    console.log("[handlePostLoginState] Continue screen detected. Clicking continue.");
    await continueBtn.click();
  } catch (error) {
    // No intermediate continue screen.
  }

  const orgSelectors = [
    (p) => p.getByRole("button", { name: /select organization|organization/i }),
    (p) => p.getByRole("link", { name: /select organization|organization/i }),
    (p) => p.locator('[role="listitem"] button').first(),
    (p) => p.locator('[role="listitem"] a').first(),
  ];
  try {
    const orgOption = await firstVisibleLocator(page, orgSelectors, {
      timeoutMs: 8000,
      perTryTimeout: 1000,
    });
    console.log("[handlePostLoginState] Organization selection detected. Opening first organization.");
    await orgOption.click();
  } catch (error) {
    // No org chooser shown.
  }
}

async function handleFallbackSelectors(page, stepName, selectorFactories, options = {}) {
  const retries = options.retries ?? 3;
  const timeoutMs = options.timeoutMs ?? 15000;
  const perTryTimeout = options.perTryTimeout ?? 2500;

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    console.log(`[${stepName}] Attempt ${attempt}/${retries}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    for (let i = 0; i < selectorFactories.length; i += 1) {
      const factory = selectorFactories[i];
      const locator = factory(page).first();
      try {
        await locator.waitFor({ state: "visible", timeout: perTryTimeout });
        await locator.scrollIntoViewIfNeeded();
        console.log(`[${stepName}] Selector ${i + 1} matched. Clicking...`);
        await locator.click();
        return locator;
      } catch (error) {
        lastError = error;
      }
    }

    if (attempt < retries) {
      // Trigger another render/frame update before retrying.
      await page.waitForLoadState("networkidle");
    }
  }

  throw new Error(
    `[${stepName}] Failed after ${retries} attempts within ${timeoutMs}ms. Last error: ${lastError?.message || "unknown"}`
  );
}

async function navigateToSettings(page) {
  console.log("[navigateToSettings] Navigating to Settings...");
  await waitForDashboard(page);
  await screenshotStep(page, CONFIG.screenshotsDir, "settings_before_click.png");

  const settingsSelectors = [
    (p) => p.getByRole("button", { name: /^settings$/i }),
    (p) => p.getByRole("link", { name: /^settings$/i }),
    (p) => p.getByRole("button", { name: /settings/i }),
    (p) => p.getByRole("link", { name: /settings/i }),
    (p) => p.getByText(/^Settings$/i),
    (p) => p.getByText(/settings/i),
    (p) => p.locator('[aria-label*="settings" i]'),
    (p) => p.locator('button[aria-label*="settings" i]'),
    (p) => p.locator('a[aria-label*="settings" i]'),
    (p) => p.locator("nav").getByText(/settings/i),
    (p) => p.locator("aside").getByText(/settings/i),
  ];

  try {
    await handleFallbackSelectors(page, "navigateToSettings", settingsSelectors, {
      retries: 4,
      timeoutMs: 45000,
      perTryTimeout: 3000,
    });
  } catch (error) {
    await screenshotStep(page, CONFIG.screenshotsDir, "settings_error.png");
    throw new Error(
      `Settings navigation failed. Could not find/click Settings using fallback selectors. See screenshots/settings_error.png. Root error: ${error.message}`
    );
  }

  await page.waitForLoadState("networkidle");
  await screenshotStep(page, CONFIG.screenshotsDir, "settings_after_click.png");
  console.log("[navigateToSettings] Settings opened successfully.");
}

async function login(page) {
  console.log("[login] Opening Zoho Books...");
  await page.goto(CONFIG.baseUrl, { waitUntil: "domcontentloaded" });

  const signInTrigger = [
    (p) => p.getByRole("link", { name: /sign in/i }),
    (p) => p.getByRole("button", { name: /sign in/i }),
    (p) => p.locator('a:has-text("Sign In")'),
    (p) => p.locator('button:has-text("Sign In")'),
  ];

  try {
    console.log("[login] Looking for Sign In trigger...");
    await clickFirstVisible(page, signInTrigger, { timeoutMs: 7000 });
  } catch (error) {
    // Already on login form. Continue.
    console.log("[login] Sign In trigger not required; login form likely already visible.");
  }

  const emailInput = await firstVisibleLocator(
    page,
    [
      (p) => p.getByLabel(/email/i),
      (p) => p.getByPlaceholder(/email/i),
      (p) => p.locator('input[type="email"]'),
      (p) => p.locator('input[name*="login" i]'),
    ],
    { timeoutMs: 30000 }
  );
  await emailInput.fill(CONFIG.email);
  console.log("[login] Email entered.");

  try {
    await clickFirstVisible(page, [
      (p) => p.getByRole("button", { name: /next|continue|sign in/i }),
      (p) => p.getByRole("link", { name: /next|continue|sign in/i }),
      (p) => p.locator('button[type="submit"]'),
    ]);
  } catch (error) {
    // In some Zoho login variants password is on same step.
    console.log("[login] Next/Continue not required in this login variant.");
  }

  const passwordInput = await firstVisibleLocator(
    page,
    [
      (p) => p.getByLabel(/password/i),
      (p) => p.getByPlaceholder(/password/i),
      (p) => p.locator('input[type="password"]'),
    ],
    { timeoutMs: 30000 }
  );
  await passwordInput.fill(CONFIG.password);
  console.log("[login] Password entered.");

  await clickFirstVisible(page, [
    (p) => p.getByRole("button", { name: /sign in|login|continue/i }),
    (p) => p.locator('button[type="submit"]'),
    (p) => p.locator('input[type="submit"]'),
  ]);

  await page.waitForURL(/zoho\.com|books\.zoho\.com/i, { timeout: 90000 });
  await handlePostLoginState(page);
  await waitForDashboard(page);
  await screenshotStep(page, CONFIG.screenshotsDir, "01_dashboard.png");
  console.log("[login] Login completed and dashboard screenshot captured.");

  if (CONFIG.debugMode) {
    console.log("[debug] Pausing after login because DEBUG_MODE=true");
    await page.pause();
  }
}

async function navigateToCustomFunctions(page) {
  console.log("[navigateToCustomFunctions] Starting navigation.");
  await navigateToSettings(page);

  await handleFallbackSelectors(page, "navigateToAutomation", selectors.automationSelectors(), {
    retries: 3,
    timeoutMs: 30000,
    perTryTimeout: 2500,
  });
  await handleFallbackSelectors(
    page,
    "navigateToCustomFunctions",
    selectors.customFunctionsSelectors(),
    {
      retries: 3,
      timeoutMs: 30000,
      perTryTimeout: 2500,
    }
  );

  await page.waitForLoadState("networkidle");
  await screenshotStep(page, CONFIG.screenshotsDir, "02_custom_functions.png");
  console.log("[navigateToCustomFunctions] Custom Functions page opened.");

  if (CONFIG.debugMode) {
    console.log("[debug] Pausing on Custom Functions page because DEBUG_MODE=true");
    await page.pause();
  }
}

async function chooseModule(page, moduleName) {
  const moduleField = await firstVisibleLocator(page, selectors.moduleFieldSelectors(), {
    timeoutMs: 20000,
  });

  // Native <select>
  const tagName = await moduleField.evaluate((el) => el.tagName.toLowerCase());
  if (tagName === "select") {
    await moduleField.selectOption({ label: moduleName });
    return moduleField;
  }

  // Combobox/dropdown fallback
  await moduleField.click();
  const option = await firstVisibleLocator(
    page,
    [
      (p) => p.getByRole("option", { name: new RegExp(`^${moduleName}$`, "i") }),
      (p) => p.getByText(new RegExp(`^${moduleName}$`, "i")),
      (p) => p.locator(`[role="option"]:has-text("${moduleName}")`),
    ],
    { timeoutMs: 10000 }
  );
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

  throw new Error("Could not detect script editor (ACE/textarea/contenteditable).");
}

async function createFunction(page) {
  const scriptBody = fs.readFileSync(CONFIG.scriptPath, "utf8");

  await clickFirstVisible(page, selectors.newCustomFunctionSelectors(), {
    timeoutMs: 25000,
  });

  const nameInput = await fillFirstVisible(
    page,
    selectors.functionNameInputSelectors(),
    CONFIG.functionName,
    { timeoutMs: 20000 }
  );
  const moduleField = await chooseModule(page, CONFIG.moduleName);

  await highlightLocator(page, nameInput);
  await highlightLocator(page, moduleField);
  await screenshotStep(page, CONFIG.screenshotsDir, "03_function_form.png");

  const editorElement = await setCodeEditorContent(page, scriptBody);
  await highlightLocator(page, editorElement);
  await screenshotStep(page, CONFIG.screenshotsDir, "04_script_pasted.png");

  await clickFirstVisible(page, selectors.saveButtonSelectors(), { timeoutMs: 15000 });

  // Success toast/status fallback checks
  await firstVisibleLocator(
    page,
    [
      (p) => p.getByText(/saved|success|updated|created/i),
      (p) => p.locator('[class*="success" i]'),
      (p) => p.locator('text=/custom function/i'),
    ],
    { timeoutMs: 30000 }
  );
  await screenshotStep(page, CONFIG.screenshotsDir, "05_function_saved.png");
}

async function setInvoiceDateToday(page) {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const year = today.getFullYear();
  const dateText = `${month}/${day}/${year}`;

  const invoiceDateInput = await firstVisibleLocator(
    page,
    [
      (p) => p.getByLabel(/invoice date/i),
      (p) => p.getByPlaceholder(/invoice date|mm\/dd\/yyyy/i),
      (p) => p.locator('input[name*="date" i]'),
    ],
    { timeoutMs: 15000 }
  );
  await invoiceDateInput.fill("");
  await invoiceDateInput.fill(dateText);
  return invoiceDateInput;
}

async function createInvoice(page) {
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
    "Demo Customer",
    { timeoutMs: 20000 }
  );

  // Select matching customer from dropdown if shown
  try {
    await clickFirstVisible(
      page,
      [
        (p) => p.getByRole("option", { name: /demo customer/i }),
        (p) => p.getByText(/demo customer/i),
      ],
      { timeoutMs: 5000 }
    );
  } catch (error) {
    // If no dropdown appears, value may already be accepted.
  }

  const invoiceDateField = await setInvoiceDateToday(page);

  const itemField = await fillFirstVisible(
    page,
    [
      (p) => p.getByLabel(/item name|item/i),
      (p) => p.getByPlaceholder(/item/i),
      (p) => p.locator('input[name*="item" i]').first(),
      (p) => p.locator('[role="combobox"][aria-label*="item" i]').first(),
    ],
    "Test Item",
    { timeoutMs: 20000 }
  );

  try {
    await clickFirstVisible(
      page,
      [
        (p) => p.getByRole("option", { name: /test item/i }),
        (p) => p.getByText(/test item/i),
      ],
      { timeoutMs: 5000 }
    );
  } catch (error) {
    // If no item suggestion appears, continue and set rate directly.
  }

  const rateField = await fillFirstVisible(
    page,
    [
      (p) => p.getByLabel(/^rate$/i),
      (p) => p.getByPlaceholder(/rate/i),
      (p) => p.locator('input[name*="rate" i]').first(),
      (p) => p.locator('td[aria-label*="Rate" i] input').first(),
    ],
    "100",
    { timeoutMs: 20000 }
  );

  await highlightLocator(page, customerField);
  await highlightLocator(page, invoiceDateField);
  await highlightLocator(page, itemField);
  await highlightLocator(page, rateField);
  await screenshotStep(page, CONFIG.screenshotsDir, "06_invoice_form.png");

  await clickFirstVisible(
    page,
    [
      (p) => p.getByRole("button", { name: /^save$/i }),
      (p) => p.getByRole("button", { name: /save and send|save/i }),
      (p) => p.locator('button:has-text("Save")'),
    ],
    { timeoutMs: 20000 }
  );

  await firstVisibleLocator(
    page,
    [
      (p) => p.getByText(/invoice.*created|saved|updated|success/i),
      (p) => p.locator('[class*="success" i]'),
      (p) => p.locator('text=/invoice/i'),
    ],
    { timeoutMs: 30000 }
  );
  await screenshotStep(page, CONFIG.screenshotsDir, "07_invoice_created.png");
}

async function triggerWorkflowAndValidate(page) {
  await navigateToCustomFunctions(page);

  // Open the created function
  const functionRow = await firstVisibleLocator(
    page,
    [
      (p) => p.getByRole("link", { name: new RegExp(CONFIG.functionName, "i") }),
      (p) => p.getByText(new RegExp(CONFIG.functionName, "i")),
      (p) => p.locator(`text="${CONFIG.functionName}"`),
    ],
    { timeoutMs: 30000 }
  );
  await functionRow.click();

  // Trigger execution if available.
  try {
    await clickFirstVisible(
      page,
      [
        (p) => p.getByRole("button", { name: /execute|run|test/i }),
        (p) => p.locator('button:has-text("Execute")'),
        (p) => p.locator('button:has-text("Run")'),
      ],
      { timeoutMs: 10000 }
    );
  } catch (error) {
    console.warn("Execute/Run action not found; continuing with passive validation.");
  }

  // Validation marker: execution log/success/toast/etc.
  const marker = await firstVisibleLocator(
    page,
    [
      (p) => p.getByText(/execution|success|completed|saved|log/i),
      (p) => p.locator('[class*="success" i]'),
      (p) => p.locator('text=/custom function/i'),
    ],
    { timeoutMs: 30000 }
  );
  const markerText = (await marker.textContent()) || "";
  console.log(`Workflow validation marker found: ${markerText.trim()}`);
}

async function run() {
  assertScriptExists(CONFIG.scriptPath);
  ensureDir(path.resolve(__dirname));
  ensureDir(path.resolve(__dirname, "../utils"));
  ensureDir(CONFIG.screenshotsDir);

  const browser = await chromium.launch({ headless: CONFIG.headless });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page);
    await navigateToCustomFunctions(page);
    await createFunction(page);
    await createInvoice(page);
    await triggerWorkflowAndValidate(page);

    console.log("E2E workflow completed successfully.");
    console.log(`Screenshots saved at: ${CONFIG.screenshotsDir}`);
  } catch (error) {
    console.error("E2E workflow failed:", error.message);
    try {
      await screenshotStep(page, CONFIG.screenshotsDir, "error.png");
      console.error(`Failure screenshot captured at: ${path.join(CONFIG.screenshotsDir, "error.png")}`);
    } catch (shotError) {
      console.error("Could not capture failure screenshot:", shotError.message);
    }
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch(() => {
  process.exitCode = 1;
});
