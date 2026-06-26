import { chromium } from "@playwright/test";
import { loadConfig, AUTH_STATE_PATH } from "./lib/config.js";
import { getPortalCredentials } from "./lib/credentials.js";

async function fillLoginForm(page: import("@playwright/test").Page): Promise<boolean> {
  const { username, password } = getPortalCredentials();
  if (!username || !password) return false;

  const userField = page.getByRole("textbox", { name: /Username/i });
  const passField = page.getByRole("textbox", { name: /Password/i });
  const loginBtn = page.getByRole("button", { name: "Login" });

  if (!(await userField.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false;
  }

  await userField.fill(username);
  await passField.fill(password);
  await loginBtn.click();
  console.log("Filled username/password from .env — complete Gmail OTP if prompted.");
  return true;
}

async function main() {
  const config = loadConfig();

  console.log("Opening portal for manual login...");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(config.portalUrl);
  await fillLoginForm(page);

  if (process.argv.includes("--pause")) {
    console.log("Complete Gmail OTP if needed, then click Resume in Playwright inspector.");
    await page.pause();
  } else {
    console.log("Waiting for login (complete Gmail OTP if prompted, up to 5 min)...");
    await page.waitForURL((url) => !url.href.includes("/login"), { timeout: 300_000 });
    console.log("Login detected.");
  }

  await context.storageState({ path: AUTH_STATE_PATH });
  console.log(`Saved session to ${AUTH_STATE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
