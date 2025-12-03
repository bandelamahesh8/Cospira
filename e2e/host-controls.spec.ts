import { test, expect } from '@playwright/test';

test('host controls and waiting room flow', async ({ browser }) => {
    test.setTimeout(60000);
    // Create Host Context
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    // Mock Host Auth
    await hostPage.addInitScript(() => {
        localStorage.setItem('shareus-test-user', JSON.stringify({
            id: 'host-user-id',
            email: 'host@example.com',
            user_metadata: { display_name: 'Host User' }
        }));
    });

    // Host creates room
    console.log('Host creating room...');
    await hostPage.goto('/');
    await hostPage.getByRole('link', { name: /Start Meeting/i }).click();
    await expect(hostPage).toHaveURL(/\/dashboard/);

    console.log('Filling room name...');
    await hostPage.getByLabel('Room Name').fill('Waiting Room Test');
    await hostPage.getByRole('button', { name: /Create & Join/i }).click();

    // Wait for room join
    console.log('Waiting for room join...');
    await expect(hostPage).toHaveURL(/\/room\/.+/);
    await expect(hostPage.getByText('Room Code:')).toBeVisible({ timeout: 20000 });

    // Enable Waiting Room via Settings
    console.log('Opening settings...');
    // Wait a bit for lazy load
    await hostPage.waitForTimeout(2000);
    const settingsBtn = hostPage.getByLabel('Room Settings');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click({ force: true });

    console.log('Toggling waiting room...');
    const waitingRoomSwitch = hostPage.getByLabel('Waiting Room');
    await expect(waitingRoomSwitch).toBeVisible({ timeout: 10000 });
    await waitingRoomSwitch.click({ force: true });

    // Close settings (click outside or press escape)
    console.log('Closing settings...');
    await hostPage.keyboard.press('Escape');

    // Get Room URL
    const roomUrl = hostPage.url();
    console.log('Room URL:', roomUrl);

    // Create Guest Context
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    // Mock Guest Auth
    await guestPage.addInitScript(() => {
        localStorage.setItem('shareus-test-user', JSON.stringify({
            id: 'guest-user-id',
            email: 'guest@example.com',
            user_metadata: { display_name: 'Guest User' }
        }));
    });

    // Guest joins room
    console.log('Guest joining room...');
    await guestPage.goto(roomUrl);

    // Guest should be in waiting room
    console.log('Checking if guest is in waiting room...');
    await expect(guestPage.getByText('Waiting for Host')).toBeVisible({ timeout: 10000 });

    // Host admits guest
    // Open participants tab
    console.log('Host opening participants tab...');
    await hostPage.getByRole('button', { name: /Show chat/i }).click(); // Ensure chat/participants panel is open
    await hostPage.getByRole('tab', { name: /Participants/i }).click();

    // Check for guest in waiting list and admit
    console.log('Host admitting guest...');
    await expect(hostPage.getByText('Guest User')).toBeVisible();
    await hostPage.getByRole('button', { name: /Admit/i }).first().click();

    // Guest should now be in the room
    console.log('Checking if guest joined...');
    await expect(guestPage.getByText('Room Code:')).toBeVisible({ timeout: 10000 });

    // Host Mutes Guest
    // We need to find the specific user's row.
    console.log('Verifying guest visibility...');
    await expect(hostPage.getByText('Guest User')).toBeVisible();
});
