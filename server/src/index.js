import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';

import { loadEnv } from './utils/loadEnv.js';
import authRoutes from './routes/auth.js';
import restaurantRoutes from './routes/restaurants.js';
import userRoutes from './routes/users.js';
import menuRoutes from './routes/menu.js';
import inventoryRoutes from './routes/inventory.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import kitchenRoutes from './routes/kitchen.js';
import cashRoutes from './routes/cash.js';
import customerRoutes from './routes/customers.js';
import dashboardRoutes from './routes/dashboard.js';
import onboardingRoutes from './routes/onboarding.js';
import inviteRoutes from './routes/invites.js';
import { seedDatabase } from './seed/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(__dirname);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', methods: ['GET', 'POST', 'PATCH'] },
});
app.set('io', io);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'TecnoPOS', slogan: 'TU NEGOCIO, EN CONTROL', time: new Date().toISOString() });
});

app.get('/api/build', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const buildFile = path.join(__dirname, '../../client/dist/build-id.json');
  if (!fs.existsSync(buildFile)) return res.json({ id: 'unknown' });
  try {
    res.json(JSON.parse(fs.readFileSync(buildFile, 'utf8')));
  } catch {
    res.json({ id: 'unknown' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/invites', inviteRoutes);

const clientDist = path.join(__dirname, '../../client/dist');
const indexHtml = path.join(clientDist, 'index.html');
app.use(
  express.static(clientDist, {
    etag: false,
    lastModified: false,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  })
);
app.get(/^(?!\/api).*/, (_req, res) => {
  if (!fs.existsSync(indexHtml)) {
    return res.status(503).send('Frontend no compilado. Revisa el Build Command / postinstall.');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(indexHtml);
});

io.on('connection', (socket) => {
  socket.on('join:restaurant', (restaurantId) => {
    if (!restaurantId) return;
    socket.join(`restaurant:${restaurantId}`);
    socket.join(`kitchen:${restaurantId}`);
  });
});

const PORT = process.env.PORT || 10000;

async function boot() {
  if (!process.env.MONGODB_URI) {
    console.error('Falta MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB conectado');

  if (process.env.SEED_ON_BOOT === 'true') {
    try {
      await seedDatabase();
    } catch (err) {
      console.error('Seed error:', err.message);
    }
  }

  server.listen(PORT, () => console.log(`TecnoPOS en puerto ${PORT}`));
}

boot().catch((err) => {
  console.error(err);
  process.exit(1);
});
