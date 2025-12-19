import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { json } from 'body-parser';

// Routes
import authRoutes from './routes/auth.routes';
import visitorRoutes from './routes/visitor.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// Security & Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
            imgSrc: ["'self'", "data:", "blob:", "https://www.chandansteel.net"],
            connectSrc: ["'self'", "https:", "wss:", "data:"],
        },
    },
}));
app.use(cors());
app.use(json({ limit: '10mb' })); // Allow large photo payloads

// Static Files (Photos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../../client/dist'))); // Serve Frontend

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// SPA Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

export default app;
