// From https://github.com/vitest-dev/vitest/discussions/5589#discussioncomment-9195492
import { fs as memFs } from 'memfs';
import { vi } from 'vitest';

vi.mock('fs', () => ({ ...memFs, default: memFs }));
vi.mock('fs/promises', () => memFs.promises);
vi.mock('node:fs', () => ({ ...memFs, default: memFs }));
vi.mock('node:fs/promises', () => ({ promises: memFs.promises }));
