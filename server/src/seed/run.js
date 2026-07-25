import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { loadEnv } from '../utils/loadEnv.js';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(__dirname);

await mongoose.connect(process.env.MONGODB_URI);
const result = await seedDatabase();
console.log(result);
await mongoose.disconnect();
