import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destDir = join(__dirname, '..', 'public', 'vendor');
mkdirSync(destDir, { recursive: true });

const pkgUrl = import.meta.resolve('@noble/ed25519');
const pkgPath = fileURLToPath(pkgUrl);
copyFileSync(pkgPath, join(destDir, 'ed25519.js'));
console.log('Vendored @noble/ed25519 to public/vendor/ed25519.js');
