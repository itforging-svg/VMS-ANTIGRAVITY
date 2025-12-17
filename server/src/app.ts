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
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded
}));
app.use(cors());
app.use(json({ limit: '10mb' })); // Allow large photo payloads

// Static Files (Photos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

export default app;
