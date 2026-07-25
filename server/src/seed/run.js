import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const result = await seedDatabase();
console.log(result);
await mongoose.disconnect();
