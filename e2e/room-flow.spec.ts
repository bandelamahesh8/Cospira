import { test, expect } from '@playwright/test';

test('create room and join', async ({ page }) => {

    // Mock auth
    await page.addInitScript(() => {
        localStorage.setItem('shareus-test-user', JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: { display_name: 'Test User' }
        }));
    });

    await page.goto('/');

    // Click "Start Meeting" on Home
    await page.getByRole('link', { name: /Start Meeting/i }).click();

    // Wait for Dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Fill Room Name
    await page.getByLabel('Room Name').fill('Test Room');

    // Click "Create & Join"
    await page.getByRole('button', { name: /Create & Join/i }).click();

    // Wait for room to be created and redirected
    await expect(page).toHaveURL(/\/room\/.+/);

    // Check if we are stuck in connecting
    const connecting = await page.getByText('Connecting...').isVisible();
    if (connecting) {
        console.log('BROWSER LOG: Stuck in Connecting state');
    }

    // Check if we are in the room (Room Code should be visible)
    // We might need to wait for connection
    await expect(page.getByText('Room Code:')).toBeVisible({ timeout: 10000 });
});
