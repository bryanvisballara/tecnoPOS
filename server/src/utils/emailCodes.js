import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import EmailCode from '../models/EmailCode.js';
import { sendVerificationCodeEmail } from './mail.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function issueEmailCode({ email, purpose, payload }) {
  const normalized = email.toLowerCase().trim();
  await EmailCode.deleteMany({ email: normalized, purpose });

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await EmailCode.create({
    email: normalized,
    purpose,
    codeHash,
    expiresAt,
    payload: payload || null,
    attempts: 0,
  });

  await sendVerificationCodeEmail({ to: normalized, code, purpose });

  return { expiresAt, expiresInMinutes: 15 };
}

export async function consumeEmailCode({ email, purpose, code }) {
  const normalized = email.toLowerCase().trim();
  const record = await EmailCode.findOne({ email: normalized, purpose }).sort({ createdAt: -1 });

  if (!record) {
    return { ok: false, error: 'No hay un código activo. Solicita uno nuevo.' };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await EmailCode.deleteMany({ email: normalized, purpose });
    return { ok: false, error: 'El código expiró. Solicita uno nuevo.' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await EmailCode.deleteMany({ email: normalized, purpose });
    return { ok: false, error: 'Demasiados intentos. Solicita un código nuevo.' };
  }

  const valid = await bcrypt.compare(String(code || '').trim(), record.codeHash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    return { ok: false, error: 'Código incorrecto' };
  }

  const payload = record.payload;
  await EmailCode.deleteMany({ email: normalized, purpose });
  return { ok: true, payload };
}
