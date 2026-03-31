function settingsMenuSelectors() {
  return [
    (page) => page.getByRole("button", { name: /^settings$/i }),
    (page) => page.getByRole("link", { name: /^settings$/i }),
    (page) => page.getByRole("button", { name: /settings/i }),
    (page) => page.getByRole("link", { name: /settings/i }),
    (page) => page.getByText(/^Settings$/i),
    (page) => page.getByText(/settings/i),
    (page) => page.locator('[aria-label*="Settings" i]'),
    (page) => page.locator('button[aria-label*="settings" i]'),
    (page) => page.locator('a[aria-label*="settings" i]'),
    (page) => page.locator("nav").getByText(/settings/i),
    (page) => page.locator("aside").getByText(/settings/i),
  ];
}

function automationSelectors() {
  return [
    (page) => page.getByRole("link", { name: /^automation$/i }),
    (page) => page.getByRole("button", { name: /^automation$/i }),
    (page) => page.getByRole("link", { name: /automation/i }),
    (page) => page.getByRole("button", { name: /automation/i }),
    (page) => page.getByText(/^Automation$/i),
    (page) => page.locator('[aria-label*="automation" i]'),
  ];
}

function customFunctionsSelectors() {
  return [
    (page) => page.getByRole("link", { name: /custom functions?/i }),
    (page) => page.getByRole("button", { name: /custom functions?/i }),
    (page) => page.getByText(/^Custom Functions?$/i),
    (page) => page.getByText(/custom functions?/i),
    (page) => page.locator('[aria-label*="custom function" i]'),
  ];
}

function newCustomFunctionSelectors() {
  return [
    (page) => page.getByRole("button", { name: /new custom function/i }),
    (page) => page.getByRole("button", { name: /^\+?\s*new/i }),
    (page) => page.locator('button:has-text("New Custom Function")'),
    (page) => page.locator('button:has-text("New")'),
  ];
}

function functionNameInputSelectors() {
  return [
    (page) => page.getByLabel(/name/i),
    (page) => page.getByPlaceholder(/name/i),
    (page) => page.locator('input[name*="name" i]'),
    (page) => page.locator('input[placeholder*="Name" i]'),
  ];
}

function moduleFieldSelectors() {
  return [
    (page) => page.getByLabel(/module/i),
    (page) => page.getByPlaceholder(/module/i),
    (page) => page.locator('[role="combobox"][aria-label*="module" i]'),
    (page) => page.locator('select[name*="module" i]'),
  ];
}

function saveButtonSelectors() {
  return [
    (page) => page.getByRole("button", { name: /^save$/i }),
    (page) => page.getByRole("button", { name: /save/i }),
    (page) => page.locator('button:has-text("Save")'),
  ];
}

function salesMenuSelectors() {
  return [
    (page) => page.getByRole("link", { name: /^sales$/i }),
    (page) => page.getByRole("button", { name: /^sales$/i }),
    (page) => page.locator('a:has-text("Sales")'),
  ];
}

function invoicesMenuSelectors() {
  return [
    (page) => page.getByRole("link", { name: /^invoices$/i }),
    (page) => page.getByRole("button", { name: /^invoices$/i }),
    (page) => page.locator('a:has-text("Invoices")'),
  ];
}

function newInvoiceSelectors() {
  return [
    (page) => page.getByRole("button", { name: /new invoice/i }),
    (page) => page.getByRole("button", { name: /^\+?\s*new/i }),
    (page) => page.locator('button:has-text("New Invoice")'),
  ];
}

module.exports = {
  settingsMenuSelectors,
  automationSelectors,
  customFunctionsSelectors,
  newCustomFunctionSelectors,
  functionNameInputSelectors,
  moduleFieldSelectors,
  saveButtonSelectors,
  salesMenuSelectors,
  invoicesMenuSelectors,
  newInvoiceSelectors,
};
