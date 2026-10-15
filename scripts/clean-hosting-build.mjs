import { rmSync } from 'node:fs';
// Runtime values are managed by Sites, never packaged as local development files.
rmSync('dist/server/.dev.vars', { force: true });
