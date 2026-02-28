import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { sign } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

const app = new Hono();

// CORS for standalone worker
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

const SECRET_KEY = 'supersecretkeyshouldbechanged'; // Fallback

// Initialize Supabase Client
const getSupabase = (env: any) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Helper to map DB record (snake_case) to Frontend (camelCase)
const mapVisitor = (v: any) => ({
    id: v.id,
    batchNo: v.batch_no,
    name: v.name,
    gender: v.gender,
    mobile: v.mobile,
    email: v.email,
    address: v.address,
    visitDate: v.visit_date,
    visitTime: v.visit_time,
    duration: v.duration,
    company: v.company,
    host: v.host,
    purpose: v.purpose,
    plant: v.plant,
    assets: v.assets,
    photoPath: v.photo_path,
    safetyEquipment: v.safety_equipment,
    visitorCardNo: v.visitor_card_no,
    aadharNo: v.aadhar_no,
    isBlacklisted: v.is_blacklisted,
    status: v.status,
    entryTime: v.entry_time,
    exitTime: v.exit_time,
    createdAt: v.created_at
});

// --- Auth Middleware ---
const authMiddleware = async (c: any, next: any) => {
    try {
        const secret = c.env.JWT_SECRET || SECRET_KEY;
        const handler = jwt({ secret, alg: 'HS256' });
        return handler(c, async () => {
            const payload = c.get('jwtPayload');
            if (payload) {
                c.set('user', payload);
                await next();
            } else {
                return c.json({ message: 'Invalid token' }, 403);
            }
        });
    } catch (err: any) {
        console.error('Auth Middleware Error:', err);
        return c.json({ message: 'Authentication failed', details: err.message }, 500);
    }
};

// --- Routes ---

// Health checks
app.get('/ping', (c) => c.text('Worker running (ROOT)'));
app.get('/api/ping', (c) => c.text('Worker running (API)'));

// Debug Route
app.get('/api/debug', (c) => {
    return c.json({
        message: 'Debug active',
        path: c.req.path,
        url: c.req.url,
        env_check: !!c.env.SUPABASE_URL
    });
});

// Auth: Login
app.post('/api/auth/login', async (c) => {
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
    }, secret, 'HS256');

    return c.json({ token, username: user.username, plant: user.plant });
});

// Global Error Handler
app.onError((err, c) => {
    console.error('Global Error:', err);
    return c.json({ message: 'Internal Server Error', error: err.message }, 500);
});

// Visitors: Get All
app.get('/api/visitors', authMiddleware, async (c) => {
    try {
        const supabase = getSupabase(c.env);
        // Safe query param access
        const status = c.req.query('status');
        const search = c.req.query('search');
        const visitDate = c.req.query('visitDate');
        const limit = c.req.query('limit');

        const user = c.get('user');

        console.log('--- Visitor Fetch Request ---');
        console.log('User:', JSON.stringify(user));
        console.log('Params:', JSON.stringify({ status, search, visitDate, limit }));

        if (!user) {
            return c.json({ message: 'User context missing' }, 401);
        }

        let query = supabase.from('visitors').select('*').or('is_deleted.is.false,is_deleted.is.null');

        if (search) {
            query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%,company.ilike.%${search}%`);
        } else if (visitDate) {
            query = query.eq('visit_date', visitDate);
        }

        if (status) query = query.eq('status', status);
        if (user.plant && user.plant !== 'null') {
            if (user.plant === 'Seamsless Division') {
                query = query.in('plant', ['Seamsless Division', 'Wire Plant']);
            } else {
                query = query.eq('plant', user.plant);
            }
        }

        query = query.order('id', { ascending: false });
        if (limit) query = query.limit(parseInt(limit));

        const { data, error } = await query;
        if (error) {
            console.error('Supabase Query Error:', error);
            return c.json({ message: error.message }, 500);
        }

        console.log(`Fetched ${data?.length} records`);
        return c.json(data ? data.map(mapVisitor) : []);
    } catch (e: any) {
        console.error('Visitor Fetch Error:', e);
        return c.json({ message: 'Unexpected server error', details: e.message }, 500);
    }
});

// Visitors: Search (Mobile/Aadhar)
app.get('/api/visitors/search', async (c) => {
    const supabase = getSupabase(c.env);
    const mobile = c.req.query('mobile');
    const aadhar = c.req.query('aadhar');

    if (!mobile && !aadhar) {
        return c.json({ message: 'Provide mobile or aadhar' }, 400);
    }

    let query = supabase.from('visitors').select('*');
    if (mobile) query = query.eq('mobile', mobile);
    else if (aadhar) query = query.eq('aadhar_no', aadhar);

    const { data, error } = await query.order('id', { ascending: false }).limit(1).single();

    if (error || !data) return c.json({ message: 'Visitor not found' }, 404);

    return c.json(mapVisitor(data));
});

// Visitors: Create
app.post('/api/visitors', async (c) => {
    const supabase = getSupabase(c.env);
    const formData = await c.req.parseBody();
    const photo = formData['photo'] as File;

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

    const istDateStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    const [day, month, year] = istDateStr.split('/');
    const dateStr = `${day}${month}${year}`;
    const batchPrefix = `VMS-${dateStr}`;

    const { data: lastVisitor } = await supabase
        .from('visitors')
        .select('batch_no')
        .ilike('batch_no', `${batchPrefix}-%`)
        .order('id', { ascending: false })
        .limit(1);

    let sequentialNum = '0001';
    if (lastVisitor && lastVisitor.length > 0 && lastVisitor[0].batch_no) {
        const parts = lastVisitor[0].batch_no.split('-');
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) sequentialNum = String(lastSeq + 1).padStart(4, '0');
    }
    const batchNo = `${batchPrefix}-${sequentialNum}`;

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

    return c.json(mapVisitor(data), 201);
});

// Visitors: Get One
app.get('/api/visitors/:id', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { data, error } = await supabase.from('visitors').select('*').eq('id', id).single();
    if (error) return c.json({ message: error.message }, 500);
    return c.json(mapVisitor(data));
});

// Visitors: Update Status
app.patch('/api/visitors/:id/status', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const user = c.get('user');

    // Fetch visitor to check permissions
    const { data: visitor, error: fetchError } = await supabase.from('visitors').select('plant').eq('id', id).single();
    if (fetchError || !visitor) return c.json({ message: 'Visitor not found' }, 404);

    if (user && user.plant) {
        if (user.plant === 'Seamsless Division') {
            if (visitor.plant !== 'Seamsless Division' && visitor.plant !== 'Wire Plant') {
                return c.json({ message: 'Access denied: Visitor belongs to a different plant' }, 403);
            }
        } else if (visitor.plant !== user.plant) {
            return c.json({ message: 'Access denied: Visitor belongs to a different plant' }, 403);
        }
    }

    let updates: any = { status };
    if (status === 'EXITED') updates.exit_time = new Date().toISOString();
    if (status === 'APPROVED') updates.entry_time = new Date().toISOString();

    const { error } = await supabase.from('visitors').update(updates).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: `Visitor ${status}` });
});

// Visitors: Update Details
app.put('/api/visitors/:id', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = c.get('user');

    // Fetch visitor to check permissions
    const { data: visitor, error: fetchError } = await supabase.from('visitors').select('plant').eq('id', id).single();
    if (fetchError || !visitor) return c.json({ message: 'Visitor not found' }, 404);

    if (user && user.plant) {
        if (user.plant === 'Seamsless Division') {
            if (visitor.plant !== 'Seamsless Division' && visitor.plant !== 'Wire Plant') {
                return c.json({ message: 'Access denied: Visitor belongs to a different plant' }, 403);
            }
        } else if (visitor.plant !== user.plant) {
            return c.json({ message: 'Access denied: Visitor belongs to a different plant' }, 403);
        }
    }

    // Map camelCase to snake_case for updates
    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.mobile) updates.mobile = body.mobile;
    if (body.company) updates.company = body.company;
    if (body.host) updates.host = body.host;
    if (body.purpose) updates.purpose = body.purpose;
    if (body.plant) updates.plant = body.plant;
    if (body.assets) updates.assets = body.assets;
    if (body.safetyEquipment) updates.safety_equipment = body.safetyEquipment;
    if (body.visitorCardNo) updates.visitor_card_no = body.visitorCardNo;
    if (body.aadharNo) updates.aadhar_no = body.aadharNo;

    const { error } = await supabase.from('visitors').update(updates).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: 'Visitor details updated successfully' });
});

// Visitors: Blacklist
app.patch('/api/visitors/:id/blacklist', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { isBlacklisted } = await c.req.json();

    const { error } = await supabase.from('visitors').update({ is_blacklisted: isBlacklisted }).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: isBlacklisted ? 'Visitor blacklisted' : 'Visitor unblacklisted' });
});

// Visitors: Delete (Soft)
app.delete('/api/visitors/:id', authMiddleware, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');

    const { error } = await supabase.from('visitors').update({ is_deleted: true }).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: 'Visitor deleted successfully' });
});

// Reports: CSV Export
app.get('/api/reports/csv', authMiddleware, async (c) => {
    try {
        const supabase = getSupabase(c.env);
        const from = c.req.query('from');
        const to = c.req.query('to');
        const user = c.get('user');

        console.log('--- Report Request ---');
        console.log('Params:', { from, to });

        let query = supabase.from('visitors').select('*');
        if (from) query = query.gte('visit_date', from);
        if (to) query = query.lte('visit_date', to);
        if (user.plant) {
            if (user.plant === 'Seamsless Division') {
                query = query.in('plant', ['Seamsless Division', 'Wire Plant']);
            } else {
                query = query.eq('plant', user.plant);
            }
        }

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
                'Content-Disposition': 'attachment; filename="visitor_report_v2.csv"',
            },
        });
    } catch (e: any) {
        console.error('Report Error:', e);
        return c.json({ message: 'Report generation failed', details: e.message }, 500);
    }
});

export default app;
