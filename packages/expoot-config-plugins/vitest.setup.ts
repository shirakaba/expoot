/// <reference types="vitest/globals" />

// vi.mock('node:fs');
// vi.mock('node:fs/promises');
vi.mock('@expo/devcert');
vi.mock('@expo/image-utils');
vi.mock('@expo/osascript');
vi.mock('@expo/rudder-sdk-node');
vi.mock('@expo/spawn-async');
vi.mock('@expo/webpack-config');
vi.mock('@expo/package-manager');
vi.mock('child_process');
vi.mock('node:child_process');
vi.mock('better-opn');
vi.mock('env-editor');
vi.mock('internal-ip');
vi.mock('ora');
vi.mock('node:os');
vi.mock('progress');
vi.mock('resolve-from');
vi.mock('tar');
vi.mock('webpack-dev-server');
vi.mock('webpack');

vi.mock('./src/utils/createTempPath');
