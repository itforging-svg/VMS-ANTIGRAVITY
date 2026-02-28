const fetch = require('node-fetch');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = 'https://localhost:3000/api';

async function testAdminSeamless() {
    try {
        console.log('--- Testing admin_seamless permissions ---');
        // 1. Login
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin_seamless', password: 'admin123' })
        });
        const { token } = await loginRes.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 2. Fetch visitors
        console.log('Fetching visitors...');
        const visRes = await fetch(`${BASE_URL}/visitors`, { headers });
        const visitors = await visRes.json();

        const plantCounts = {};
        visitors.forEach(v => { plantCounts[v.plant] = (plantCounts[v.plant] || 0) + 1 });
        console.log('Visitor Counts by Plant for admin_seamless:', plantCounts);

        if (!plantCounts['Seamsless Division'] && !plantCounts['Wire Plant']) {
            console.log('No seamless or wire records found. This tests the logic but may need data to verify fully.');
        }

        // 3. Find a Wire Plant visitor and try to update its status
        const wireVisitor = visitors.find(v => v.plant === 'Wire Plant');
        if (wireVisitor) {
            console.log(`\nAttempting to update status for Wire Plant visitor ID: ${wireVisitor.id}`);
            const statusUpdateRes = await fetch(`${BASE_URL}/visitors/${wireVisitor.id}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: wireVisitor.status === 'PENDING' ? 'APPROVED' : wireVisitor.status === 'APPROVED' ? 'EXITED' : 'PENDING' })
            });
            console.log('Status update result:', statusUpdateRes.status, await statusUpdateRes.text());
        } else {
            console.log('\nNo Wire Plant visitor found to test edit permissions.');
        }

        // 4. Test CSV Export
        console.log('\nTesting CSV Export...');
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const csvRes = await fetch(`${BASE_URL}/reports/csv?from=${from}&to=${to}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const csvText = await csvRes.text();

        const lines = csvText.split('\n');
        const wireRecords = lines.filter(l => l.includes('Wire Plant'));
        const seamlessRecords = lines.filter(l => l.includes('Seamsless Division'));
        console.log(`CSV Output Lines: ${lines.length}`);
        console.log(`  Wire Plant records in CSV: ${wireRecords.length}`);
        console.log(`  Seamsless Division records in CSV: ${seamlessRecords.length}`);

        if (wireRecords.length > 0 && seamlessRecords.length > 0) {
            console.log('✅ CSV correctly includes both plants.');
        } else {
            console.log('⚠️ Warning: Mismatch in CSV export logic or lack of data.');
        }


    } catch (e) {
        console.error('Test failed:', e);
    }
}

testAdminSeamless();
