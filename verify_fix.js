const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  
  // Wait for the button and click it
  console.log('Clicking Start Audit...');
  await page.click('button:has-text("Start Audit")');
  
  // Wait for the address field to be filled. 
  // We'll wait until the field has value.
  console.log('Waiting for Vendor Address field to be filled...');
  const addressField = page.locator('#vendor-address');
  
  try {
    // Wait up to 30 seconds for the agent to finish all steps
    // We expect the address to be filled after the HITL and payment terms
    await addressField.waitFor({ state: 'visible', timeout: 30000 });
    
    // Check value periodically
    let attempts = 0;
    while (attempts < 20) {
      const val = await addressField.inputValue();
      if (val && val.length > 5) {
        console.log('SUCCESS: Vendor Address field filled with:', val);
        break;
      }
      await page.waitForTimeout(1000);
      attempts++;
    }
    
    if (attempts === 20) {
      console.error('FAILURE: Vendor Address field not filled in time.');
      process.exit(1);
    }
    
    // Verify Audit Receipt
    const receiptHeader = page.locator('h2:has-text("Audit Complete")');
    await receiptHeader.waitFor({ state: 'visible', timeout: 10000 });
    console.log('SUCCESS: Audit Complete receipt visible.');

  } catch (e) {
    console.error('Verification failed:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
