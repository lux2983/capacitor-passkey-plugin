import { registerPlugin } from '@capacitor/core';

import type { PasskeyPlugin as PasskeyPluginType } from './definitions.js';

// Rename the type locally to avoid conflict
const PasskeyPlugin = registerPlugin<PasskeyPluginType>('PasskeyPlugin', {
  web: () => import('./web.js').then((m) => new m.WebPasskeyPlugin()),
});

export * from './definitions.js';
export { PasskeyPlugin };
