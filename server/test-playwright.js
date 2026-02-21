// Test script to verify Playwright installation and basic functionality
import { chromium } from 'playwright';

console.log('🧪 Testing Playwright installation...\n');

async function testPlaywright() {
  try {
    console.log('1️⃣ Launching browser...');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
      ]
    });
    console.log('✅ Browser launched successfully!');

    console.log('\n2️⃣ Creating new context and page...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    console.log('✅ Page created successfully!');

    console.log('\n3️⃣ Navigating to Google...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle', timeout: 10000 });
    console.log('✅ Navigation successful!');

    console.log('\n4️⃣ Testing screenshot capture...');
    const screenshot = await page.screenshot({ 
      type: 'jpeg', 
      quality: 70,
      fullPage: false 
    });
    console.log('✅ Screenshot captured successfully!');
    console.log('   Screenshot size:', screenshot.length, 'bytes');

    console.log('\n5️⃣ Testing base64 encoding...');
    const base64 = screenshot.toString('base64');
    console.log('✅ Base64 encoding successful!');
    console.log('   Base64 size:', base64.length, 'characters');

    console.log('\n6️⃣ Closing browser...');
    await context.close();
    await browser.close();
    console.log('✅ Browser closed successfully!');

    console.log('\n🎉 All tests passed! Playwright is working correctly.');
    console.log('   You can now use the Virtual Browser feature.');
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Reinstall Playwright: npm install playwright');
    console.error('2. Install Chromium: npx playwright install chromium');
    console.error('3. Check system dependencies');
    process.exit(1);
  }
}

testPlaywright();
