import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
    }
  });

  page.on('pageerror', error => {
    console.error(`PAGE EXCEPTION:`, error.message);
  });

  try {
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle0' });

    // Assuming we might need to mock auth or if dashboard needs login?
    // Wait, the user mentioned they are at Dashboard. 
    // They might skip login if localStorage / cookies are set.
    // If not, maybe we just mock it. Let's see if we get redirected to /auth
    const url = page.url();
    console.log('Current URL:', url);
    
    if (url.includes('/auth')) {
      console.log('Got redirected to auth. Setting up fake token if possible, or just trying to navigate manually?');
      // For now let's hope it's not strictly protected or we just hit a redirect error.
      // Wait, is there a mock auth or login? Let's check.
    }

    console.log('Looking for collapse button...');
    const collapseButtonLocator = await page.waitForSelector('button svg.lucide-panel-left-close', { timeout: 3000 }).catch(() => null);
    
    if (collapseButtonLocator) {
      console.log('Collapsing sidebar...');
      await page.evaluate(() => {
        document.querySelector('button .lucide-panel-left-close').closest('button').click();
      });
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.log('Sidebar might already be collapsed or toggle button not found.');
    }

    console.log('Clicking Organizations link...');
    await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const orgBtn = Array.from(buttons).find(b => b.textContent && b.textContent.includes('Organizations') || b.querySelector('.lucide-building-2'));
        if (orgBtn) orgBtn.click();
        else console.log('Could not find Organizations button!');
    });

    console.log('Waiting after click...');
    await new Promise(r => setTimeout(r, 2000));
    console.log('After click URL:', page.url());

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    await browser.close();
  }
})();
