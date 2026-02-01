import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const app = new Hono();

// CORS for standalone worker
app.use('/*', cors({
    origin: '*', // For development, update with frontend URL later
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));

const SECRET_KEY = 'supersecretkeyshouldbechanged'; // Fallback

// Initialize Supabase Client
const getSupabase = (env: any) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// --- Auth Middleware ---
// Using Hono's built-in JWT middleware for protected routes
const authMiddleware = async (c: any, next: any) => {
    const secret = c.env.JWT_SECRET || SECRET_KEY;
    const handler = jwt({ secret });
    return handler(c, async () => {
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

// Health check / Ping
app.get('/ping', (c) => c.text('Pong! Backend Worker is active.'));

// Debug Route
app.get('/debug', (c) => {
    return c.json({
        message: 'Debug active',
        path: c.req.path,
        url: c.req.url,
        env_check: !!c.env.SUPABASE_URL
    });
});

// Health check (legacy)
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

    const isMatch = await new Promise((resolve, reject) => {
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });

    if (!isMatch) return c.json({ message: 'Invalid credentials' }, 401);

    const secret = c.env.JWT_SECRET || SECRET_KEY;
    const token = await sign({
        id: user.id,
        username: user.username,
        plant: user.plant,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
        iat: Math.floor(Date.now() / 1000)
    }, secret);

    return c.json({ token, username: user.username, plant: user.plant });
});

// ... [rest of the routes are identical but without /api prefix in the path]
// Since we removed basePath('/api'), /visitors is now /visitors relative to the Worker domain.

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

// Visitors: Create
app.post('/visitors', async (c) => {
    const supabase = getSupabase(c.env);
    const formData = await c.req.parseBody();
    const photo = formData['photo'] as File;

    // 1. Photo Upload
    let photoPath = '';
    if (photo && photo instanceof File) {
        const filename = `${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
            .from('visitor-photos')
            .upload(`uploads/${filename}`, await photo.arrayBuffer(), {
                contentType: photo.type,
            });

        if (uploadError) return c.json({ message: 'Photo upload failed', error: uploadError.message }, 500);

        photoPath = supabase.storage.from('visitor-photos').getPublicUrl(`uploads/${filename}`).data.publicUrl;
    }

    // 2. Batch Number Generation
    const istDateStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    const [day, month, year] = istDateStr.split('/');
    const dateStr = `${day}${month}${year}`;
    const batchPrefix = `VMS-${dateStr}`;

    const { data: lastVisitor } = await supabase
        .from('visitors')
        .select('batch_no')
        .ilike('batch_no', `${batchPrefix}-%`)
        .order('id', { ascending: false })
        .limit(1)
        .single();

    let sequentialNum = '0001';
    if (lastVisitor && lastVisitor.batch_no) {
        const parts = lastVisitor.batch_no.split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) sequentialNum = String(lastSeq + 1).padStart(4, '0');
    }
    const batchNo = `${batchPrefix}-${sequentialNum}`;

    // 3. Insert Record
    const visitorData = {
        batch_no: batchNo,
        name: formData['name'],
        gender: formData['gender'],
        mobile: formData['mobile'],
        email: formData['email'] || '',
        address: formData['address'] || '',
        visit_date: formData['visitDate'],
        visit_time: formData['visitTime'],
        duration: formData['duration'],
        company: formData['company'],
        host: formData['host'],
        purpose: formData['purpose'],
        plant: formData['plant'],
        assets: formData['assets'],
        safety_equipment: formData['safetyEquipment'] || '',
        visitor_card_no: formData['visitorCardNo'] || '',
        aadhar_no: formData['aadharNo'] || '',
        photo_path: photoPath,
        status: 'PENDING',
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('visitors').insert([visitorData]).select().single();
    if (error) return c.json({ message: error.message }, 500);

    return c.json(data, 201);
});

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

export default app;
