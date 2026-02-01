import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const app = new Hono().basePath('/api');

// CORS should be handled, adding it for safety
app.use('/*', cors());

const SECRET_KEY = 'supersecretkeyshouldbechanged'; // Fallback

// Initialize Supabase Client
const getSupabase = (env: any) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// --- Auth Middleware ---
// Using Hono's built-in JWT middleware for protected routes
// We apply it dynamically or use a custom wrapper to match existing logic
const authMiddleware = async (c: any, next: any) => {
    const secret = c.env.JWT_SECRET || SECRET_KEY;
    const handler = jwt({ secret });
    return handler(c, async () => {
        // Hono jwt middleware puts payload in c.get('jwtPayload')
        const payload = c.get('jwtPayload');
        if (payload) {
            c.set('user', payload);
            await next();
        } else {
            return c.json({ message: 'Invalid token' }, 403);
        }
    });
};

// --- Routes ---

// Debug Route
app.get('/debug', (c) => {
    return c.json({
        message: 'Debug active',
        path: c.req.path,
        url: c.req.url,
        env_check: !!c.env.SUPABASE_URL
    });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date(), env: !!c.env.SUPABASE_URL }));

// Auth: Login
app.post('/auth/login', async (c) => {
    const { username, password } = await c.req.json();
    const supabase = getSupabase(c.env);

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) return c.json({ message: 'Invalid credentials' }, 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return c.json({ message: 'Invalid credentials' }, 401);

    const secret = c.env.JWT_SECRET || SECRET_KEY;
    // Hono sign returns a Promise<string>
    const token = await sign({ id: user.id, username: user.username, plant: user.plant, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }, secret); // 12h exp

    return c.json({ token, username: user.username, plant: user.plant });
});

// Visitors: Get All
app.get('/visitors', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const { status, search, visitDate, limit } = c.req.query();
    const user = c.get('user');

    let query = supabase.from('visitors').select('*').or('is_deleted.is.false,is_deleted.is.null');

    if (search) {
        query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%,company.ilike.%${search}%`);
    } else if (visitDate) {
        query = query.eq('visit_date', visitDate);
    }

    if (status) query = query.eq('status', status);
    if (user.plant) query = query.eq('plant', user.plant);

    query = query.order('id', { ascending: false });
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;
    if (error) return c.json({ message: error.message }, 500);

    return c.json(data);
});

// Visitors: Create (Assuming no auth needed for self-registration, or add authMiddleware if internal)
// Leaving as is if public, or adding if internal. Based on previous code it was public. 
// CHECK: app.post('/visitors', ... ) in original code didn't have authenticate. Correct.

// Reports: CSV Export
app.get('/reports/csv', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const { from, to } = c.req.query();
    const user = c.get('user');

    let query = supabase.from('visitors').select('*');
    if (from) query = query.gte('visit_date', from);
    if (to) query = query.lte('visit_date', to);
    if (user.plant) query = query.eq('plant', user.plant);

    const { data: visitors, error } = await query.order('id', { ascending: false });
    if (error) return c.json({ message: error.message }, 500);

    const headers = ['Batch No', 'Name', 'Mobile', 'Company', 'Host', 'Purpose', 'Plant', 'Assets', 'Visit Date', 'Visit Time', 'Entry Time', 'Exit Time', 'Status', 'Photo Link'];
    const csvRows = [headers.join(',')];

    visitors?.forEach(v => {
        const row = [v.batch_no, `"${v.name}"`, v.mobile, `"${v.company}"`, `"${v.host}"`, `"${v.purpose}"`, `"${v.plant || ''}"`, `"${v.assets || ''}"`, v.visit_date, v.visit_time, v.entry_time || '', v.exit_time || '', v.status, `"${v.photo_path || ''}"`];
        csvRows.push(row.join(','));
    });

    return new Response(csvRows.join('\n'), {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="visitor_report.csv"',
        },
    });
});

// Visitors: Update Status
app.patch('/visitors/:id/status', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { status } = await c.req.json();

    let updates: any = { status };
    if (status === 'EXITED') updates.exit_time = new Date().toISOString();
    if (status === 'APPROVED') updates.entry_time = new Date().toISOString();

    const { error } = await supabase.from('visitors').update(updates).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: `Visitor ${status}` });
});

// Visitors: Update Details
app.put('/visitors/:id', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const body = await c.req.json();

    const { error } = await supabase.from('visitors').update(body).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: 'Visitor details updated successfully' });
});

// Visitors: Blacklist
app.patch('/visitors/:id/blacklist', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { isBlacklisted } = await c.req.json();

    const { error } = await supabase.from('visitors').update({ is_blacklisted: isBlacklisted }).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: isBlacklisted ? 'Visitor blacklisted' : 'Visitor unblacklisted' });
});

// Visitors: Delete (Soft)
app.delete('/visitors/:id', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');

    const { error } = await supabase.from('visitors').update({ is_deleted: true }).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: 'Visitor deleted successfully' });
});

export const onRequest = handle(app);
