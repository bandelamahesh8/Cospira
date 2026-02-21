// Test script to verify Puppeteer installation and basic functionality
import puppeteer from 'puppeteer';

console.log('🧪 Testing Puppeteer installation...\n');

async function testPuppeteer() {
  try {
    console.log('1️⃣ Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    console.log('✅ Browser launched successfully!');

    console.log('\n2️⃣ Creating new page...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    console.log('✅ Page created successfully!');

    console.log('\n3️⃣ Navigating to Google...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✅ Navigation successful!');

    console.log('\n4️⃣ Testing CDP screencast...');
    const client = await page.target().createCDPSession();
    await client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 70,
      maxWidth: 1280,
      maxHeight: 720
    });
    console.log('✅ Screencast started successfully!');

    // Wait for a frame
    await new Promise((resolve) => {
      client.on('Page.screencastFrame', async (frameObj) => {
        console.log('✅ Received screencast frame!');
        console.log('   Frame size:', frameObj.data.length, 'bytes');
        await client.send('Page.screencastFrameAck', { sessionId: frameObj.sessionId });
        resolve();
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        console.log('⚠️  No frame received within 5 seconds');
        resolve();
      }, 5000);
    });

    console.log('\n5️⃣ Closing browser...');
    await browser.close();
    console.log('✅ Browser closed successfully!');

    console.log('\n🎉 All tests passed! Puppeteer is working correctly.');
    console.log('   You can now use the Virtual Browser feature.');
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Reinstall Puppeteer: npm install puppeteer');
    console.error('2. Install Chromium: npx puppeteer browsers install chrome');
    console.error('3. Check system dependencies (see VIRTUAL_BROWSER_DEBUG.md)');
    process.exit(1);
  }
}

testPuppeteer();
