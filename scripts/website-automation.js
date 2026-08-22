const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://playwright.dev';
const OUTPUT_DIR = path.join(__dirname, '..', 'automation-output');

async function runAutomation() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Starting automation against ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Open homepage
    await page.goto(BASE_URL);
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Step 2: Capture homepage screenshot
    const homepageScreenshot = path.join(OUTPUT_DIR, 'homepage.png');
    await page.screenshot({ path: homepageScreenshot, fullPage: true });
    console.log(`Saved screenshot: ${homepageScreenshot}`);

    // Step 3: Navigate to docs
    await page.getByRole('link', { name: 'Docs' }).first().click();
    await page.waitForURL(/docs/);
    console.log(`Navigated to: ${page.url()}`);

    // Step 4: Collect visible headings
    const headings = await page.locator('h1, h2').allTextContents();
    const headingList = headings.map((text) => text.trim()).filter(Boolean);
    console.log(`Found ${headingList.length} headings on docs page`);

    // Step 5: Save automation report
    const report = {
      url: BASE_URL,
      title,
      docsUrl: page.url(),
      headings: headingList.slice(0, 10),
      timestamp: new Date().toISOString(),
    };

    const reportPath = path.join(OUTPUT_DIR, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Saved report: ${reportPath}`);

    // Step 6: Capture docs page screenshot
    const docsScreenshot = path.join(OUTPUT_DIR, 'docs-page.png');
    await page.screenshot({ path: docsScreenshot, fullPage: false });
    console.log(`Saved screenshot: ${docsScreenshot}`);

    console.log('Automation completed successfully.');
  } catch (error) {
    console.error('Automation failed:', error.message);

    const errorScreenshot = path.join(OUTPUT_DIR, 'error.png');
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    console.error(`Error screenshot saved: ${errorScreenshot}`);

    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runAutomation();
