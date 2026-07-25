import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Carga .env local si existe. En Render las vars ya vienen en process.env. */
export function loadEnv(fromDir = path.dirname(fileURLToPath(import.meta.url))) {
  const candidates = [
    path.join(fromDir, '../../.env'),
    path.join(fromDir, '../../../.env'),
    path.join(process.cwd(), '.env'),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}
