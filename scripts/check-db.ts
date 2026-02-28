
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://paxtowkaspywbetglotd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBheHRvd2thc3B5d2JldGdsb3RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY4OTg4NSwiZXhwIjoyMDg1MjY1ODg1fQ.AZi7qr02-qK4Z_CChDdUcflNw17150_vlL9oWtsEwhg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log('Checking Supabase data...');

    // Check visitors
    const { count, error } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching visitors count:', error);
    } else {
        console.log('Total visitor records:', count);
    }

    // Check users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('username, plant');

    if (userError) {
        console.error('Error fetching users:', userError);
    } else {
        console.log('Users in database:', users?.length);
        users?.forEach(u => console.log(` - ${u.username} (${u.plant})`));
    }

    // Check counts by date for the last few days
    const { data: dateCounts, error: countError } = await supabase
        .rpc('get_visitor_counts_by_date'); // This might not exist, let's use raw query if possible or just fetch all dates

    // Alternative: fetch distinct dates (simulated by fetching last 100 and aggregating in JS for simplicity)
    const { data: recentVisitors } = await supabase
        .from('visitors')
        .select('visit_date, created_at')
        .order('id', { ascending: false })
        .limit(200);

    const counts: Record<string, number> = {};
    recentVisitors?.forEach(v => {
        counts[v.visit_date] = (counts[v.visit_date] || 0) + 1;
    });
    console.log('Visitor Counts by Date (Last 200 records):', counts);

    // Specific check for 2026-01-30
    const targetDate = '2026-01-30';
    const { data: targetRecords } = await supabase
        .from('visitors')
        .select('id, name, visit_date, plant, is_deleted, status, exit_time')
        .eq('visit_date', targetDate);

    console.log(`Records matching ${targetDate}:`, targetRecords?.length);
    if (targetRecords && targetRecords.length > 0) {
        console.log('Sample match:', targetRecords[0]);
        const statuses = targetRecords.map(r => r.status);
        console.log(`Statuses on ${targetDate}:`, [...new Set(statuses)]);
        const exitTimes = targetRecords.map(r => r.exit_time);
        console.log(`Exit times present:`, exitTimes.some(t => t));
        const deletedCount = targetRecords.filter(r => r.is_deleted).length;
        console.log(`Deleted records on ${targetDate}:`, deletedCount);
    }

    // Check today's records
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecords } = await supabase
        .from('visitors')
        .select('name, visit_date')
        .eq('visit_date', today);

    console.log(`Records for today (${today}):`, todayRecords?.length);
    if (todayRecords && todayRecords.length > 0) {
        console.log('Sample for today:', todayRecords[0]);
    }

    // Check records without filters
    const { data: allSamples } = await supabase
        .from('visitors')
        .select('name, visit_date, plant')
        .order('id', { ascending: false })
        .limit(10);
    console.log('Latest 10 records:', JSON.stringify(allSamples, null, 2));
}

checkData();
