const API_URL = 'http://localhost:3002';

async function testRoomSettings() {
    console.log('🚀 Starting Advanced Room Settings Verification...');

    try {
        // 1. Create a room with advanced settings
        const roomId = `test-room-${Date.now()}`;
        console.log(`\n1. Creating room: ${roomId}`);
        
        const createResponse = await fetch(`${API_URL}/api/create-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                roomName: 'Security Test Room',
                userId: 'test-host-id',
                accessType: 'public',
                settings: {
                    waiting_lobby: true,
                    host_controlled_speaking: true,
                    hidden_room: true
                }
            })
        });

        const createData = await createResponse.json();
        if (createData.success) {
            console.log('✅ Room created successfully with advanced settings');
        }

        // 2. Verify hidden_room setting (should not appear in public list)
        console.log('\n2. Verifying hidden_room setting...');
        const listResponse = await fetch(`${API_URL}/api/rooms`);
        const listData = await listResponse.json();
        const isHidden = !listData.some(r => r.id === roomId);
        if (isHidden) {
            console.log('✅ Room is hidden from public list as expected');
        } else {
            console.log('❌ Room is visible in public list (hidden_room failed)');
        }

        console.log('\n3. Real-time Verification Note:');
        console.log('   Please open the dashboard and verify the following manually:');
        console.log('   - Join the room as a guest and verify you are sent to "Security Barrier".');
        console.log('   - Host sees them in "Waiting Room" and can approve.');
        console.log('   - Verify speaker restrictions work when host_controlled_speaking is set.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRoomSettings().then(() => {
    console.log('\n✨ Verification script finished.');
    process.exit(0);
});
