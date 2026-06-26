const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set default timeout to 120 seconds because Next.js dev server can be slow to compile
  page.setDefaultTimeout(120000);

  console.log('Navigating to http://localhost:3000/login');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });

  console.log('Waiting for email input...');
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  // Fill in login credentials
  console.log('Filling in credentials...');
  await page.fill('input[type="email"]', 'anasbikes1992@gmail.com');
  await page.fill('input[type="password"]', '123456');

  // Submit form
  console.log('Submitting login...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.click('button[type="submit"]')
  ]);

  console.log('Current URL after login:', page.url());
  
  if (page.url().includes('/admin') || page.url().includes('/dashboard')) {
    console.log('✅ Login successful!');
    await page.screenshot({ path: 'dashboard-screenshot.png' });
    console.log('Dashboard screenshot saved to dashboard-screenshot.png');
  } else {
    console.log('❌ Login failed or did not redirect properly.');
    await page.screenshot({ path: 'login-failed.png' });
  }

  await browser.close();
})();
