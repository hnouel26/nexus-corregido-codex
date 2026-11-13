import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, '.env');
if (existsSync(target)) {
  console.log('.env ya existe; se conserva sin cambios.');
} else {
  let env = readFileSync(resolve(root, '.env.example'), 'utf8');
  for (const key of ['NEXTAUTH_SECRET', 'ENCRYPTION_KEY', 'POSTGRES_PASSWORD', 'MINIO_ROOT_PASSWORD', 'SEED_ADMIN_PASSWORD']) {
    env = env.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}="${randomBytes(32).toString('hex')}"`);
  }
  const password = env.match(/^POSTGRES_PASSWORD="([^"]+)"/m)[1];
  env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="postgresql://nexus:${password}@localhost:5432/nexus_db"`);
  writeFileSync(target, env, { flag: 'wx', mode: 0o600 });
  console.log('.env creado. Consulta SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para iniciar sesión.');
}
