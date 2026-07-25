import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';

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
import { seedDatabase } from './seed/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

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

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
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
