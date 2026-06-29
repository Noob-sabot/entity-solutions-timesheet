import { chromium } from "@playwright/test";
import { FIGMA_AUTH_STATE_PATH } from "./lib/figjam-config.js";

const FIGMA_LOGIN_URL = "https://www.figma.com/login";

async function main() {
  console.log("Opening Figma for manual login...");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(FIGMA_LOGIN_URL, { waitUntil: "domcontentloaded" });

  if (process.argv.includes("--pause")) {
    console.log("Log in to Figma, then click Resume in the Playwright inspector.");
    await page.pause();
  } else {
    console.log("Waiting for login (up to 5 min)...");
    await page.waitForURL(
      (url) => url.hostname === "www.figma.com" && !url.pathname.includes("/login"),
      { timeout: 300_000 }
    );
    console.log("Login detected.");
  }

  await context.storageState({ path: FIGMA_AUTH_STATE_PATH });
  console.log(`Saved session to ${FIGMA_AUTH_STATE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
