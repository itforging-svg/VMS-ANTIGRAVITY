import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const app = new Hono().basePath('/api');

const SECRET_KEY = 'supersecretkeyshouldbechanged'; // Fallback, should use env

// Initialize Supabase Client
const getSupabase = (env: any) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// --- Auth Middleware ---
const authenticate = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return c.json({ message: 'No token provided' }, 401);

    try {
        const secret = c.env.JWT_SECRET || SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        c.set('user', decoded);
        await next();
    } catch (err) {
        return c.json({ message: 'Invalid token' }, 403);
    }
};

// --- Routes ---

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
    const token = jwt.sign({ id: user.id, username: user.username, plant: user.plant }, secret, { expiresIn: '12h' });

    return c.json({ token, username: user.username, plant: user.plant });
});

// Visitors: Get All
app.get('/visitors', authenticate, async (c) => {
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

    // Map to camelCase if needed, but here we'll return raw for simplicity as the frontend handles it or we can map
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

    // 2. Batch Number Generation (Sequential Logic)
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
app.get('/reports/csv', authenticate, async (c) => {
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
app.patch('/visitors/:id/status', authenticate, async (c) => {
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
app.put('/visitors/:id', authenticate, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const body = await c.req.json();

    const { error } = await supabase.from('visitors').update(body).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: 'Visitor details updated successfully' });
});

// Visitors: Blacklist
app.patch('/visitors/:id/blacklist', authenticate, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { isBlacklisted } = await c.req.json();

    const { error } = await supabase.from('visitors').update({ is_blacklisted: isBlacklisted }).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: isBlacklisted ? 'Visitor blacklisted' : 'Visitor unblacklisted' });
});

// Visitors: Delete (Soft)
app.delete('/visitors/:id', authenticate, async (c) => {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');

    const { error } = await supabase.from('visitors').update({ is_deleted: true }).eq('id', id);
    if (error) return c.json({ message: error.message }, 500);

    return c.json({ message: 'Visitor deleted successfully' });
});

export const onRequest = handle(app);
