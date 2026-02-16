# Integration Guide

This guide shows how to integrate `capacitor-passkey-plugin` with `smart-account-kit` in a Capacitor app.

All examples use the SimpleWebAuthn-compatible adapter (`asSimpleWebAuthn`) instead of raw plugin calls.

## Prerequisites

- Node.js 18+
- Capacitor 8+
- iOS 15+
- Android API 28+
- A deployed Smart Account verifier contract and account WASM hash
- A configured passkey RP domain (Associated Domains + Digital Asset Links)

## Installation

```bash
npm install capacitor-passkey-plugin smart-account-kit
npm install @capacitor/preferences
npx cap sync
```

Notes:
- `@capacitor/preferences` is required only when you use `CapacitorStorageAdapter`.
- If you bring your own `StorageAdapter`, `@capacitor/preferences` is optional.

## 1. Configure Smart Account Kit with the Passkey Adapter

Create a kit factory (`src/kit.ts`):

```ts
import { SmartAccountKit } from 'smart-account-kit';
import { PasskeyPlugin } from 'capacitor-passkey-plugin';
import { asSimpleWebAuthn } from 'capacitor-passkey-plugin/adapter';
import { CapacitorStorageAdapter } from 'capacitor-passkey-plugin/storage';

export function createKit() {
  return new SmartAccountKit({
    rpcUrl: import.meta.env.VITE_RPC_URL,
    networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
    accountWasmHash: import.meta.env.VITE_ACCOUNT_WASM_HASH,
    webauthnVerifierAddress: import.meta.env.VITE_WEBAUTHN_VERIFIER_ADDRESS,
    rpId: import.meta.env.VITE_PASSKEY_RP_ID,
    rpName: import.meta.env.VITE_PASSKEY_RP_NAME,
    relayerUrl: import.meta.env.VITE_RELAYER_URL || undefined,
    storage: new CapacitorStorageAdapter('smart-account-demo'),
    webAuthn: asSimpleWebAuthn(PasskeyPlugin),
  });
}
```

The key integration points are:
- `webAuthn: asSimpleWebAuthn(PasskeyPlugin)`
- `storage: new CapacitorStorageAdapter('<prefix>')`

## 2. Storage Adapter Setup

The storage adapter persists credentials and session state in `@capacitor/preferences`.

```ts
import { CapacitorStorageAdapter } from 'capacitor-passkey-plugin/storage';

const storage = new CapacitorStorageAdapter('my-wallet-app');

await storage.saveSession({
  contractId: 'CB5....',
  credentialId: 'aBase64UrlCredentialId',
  connectedAt: Date.now(),
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
});

const session = await storage.getSession();
```

Use a unique prefix per app/environment (`dev`, `staging`, `prod`) to avoid collisions.

## 3. Create a Wallet

```ts
import { createKit } from './kit';

const kit = createKit();

const created = await kit.createWallet('My Wallet App', 'alice@example.com', {
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    userVerification: 'required',
  },
  autoSubmit: true,
  autoFund: true,
  nativeTokenContract: import.meta.env.VITE_NATIVE_TOKEN_CONTRACT,
});

console.log('Contract:', created.contractId);
console.log('Credential:', created.credentialId);
console.log('Deploy tx hash:', created.submitResult?.hash);
```

What you get:
- `contractId`: deployed smart account address
- `credentialId`: passkey credential ID for reconnect/signing
- `submitResult` / `fundResult`: optional transaction outcomes when `autoSubmit` / `autoFund` are enabled

## 4. Connect an Existing Wallet

```ts
import { createKit } from './kit';

const kit = createKit();

// 1) Silent restore (no prompt)
const restored = await kit.connectWallet();

// 2) Prompt user if restore was not possible
const connected = restored ?? (await kit.connectWallet({ prompt: true }));

if (!connected) {
  throw new Error('No wallet selected');
}

console.log('Connected contract:', connected.contractId);
console.log('Connected credential:', connected.credentialId);
```

Useful modes:
- `connectWallet()` -> silent restore from stored session
- `connectWallet({ prompt: true })` -> prompt passkey selection if needed
- `connectWallet({ fresh: true })` -> always force fresh passkey prompt
- `connectWallet({ credentialId, contractId })` -> connect a known wallet directly

## 5. Sign and Submit a Transaction

For token transfers, use the high-level helper:

```ts
const result = await kit.transfer(
  import.meta.env.VITE_NATIVE_TOKEN_CONTRACT,
  recipientAddress,
  amountXlm,
);

if (!result.success) {
  throw new Error(result.error || 'Transfer failed');
}

console.log('Submitted hash:', result.hash);
```

For custom transactions, use `signAndSubmit()` (recommended over low-level signing):

```ts
const preparedTx = await buildPreparedTransactionSomehow();

const result = await kit.signAndSubmit(preparedTx, {
  forceMethod: 'relayer',
});

if (!result.success) {
  throw new Error(result.error || 'Transaction failed');
}
```

## 6. Error Handling

Adapter calls throw `Error` objects with a mapped DOM error `name` plus a plugin-specific `pluginErrorCode` field.

```ts
import { SmartAccountError, SmartAccountErrorCode } from 'smart-account-kit';

type MaybePasskeyError = Error & { pluginErrorCode?: string };

function isPasskeyError(error: unknown): error is MaybePasskeyError {
  return error instanceof Error && 'pluginErrorCode' in error;
}

try {
  await kit.connectWallet({ prompt: true });
} catch (error) {
  if (isPasskeyError(error)) {
    switch (error.pluginErrorCode) {
      case 'CANCELLED':
      case 'NO_CREDENTIAL':
        // User cancelled or no passkey selected
        break;
      case 'TIMEOUT':
        // Prompt took too long
        break;
      case 'RPID_VALIDATION_ERROR':
        // Domain association mismatch (commonly iOS)
        break;
      case 'PROVIDER_CONFIG_ERROR':
        // Credential provider is unavailable/misconfigured
        break;
      default:
        console.error('Passkey error:', error.name, error.message);
    }
  } else if (error instanceof SmartAccountError) {
    if (error.code === SmartAccountErrorCode.WALLET_NOT_CONNECTED) {
      // Ask user to connect first
    }
  } else {
    console.error('Unexpected error', error);
  }
}
```

## 7. Validate the Integration

```bash
npm run build
npm run verify:ios
npm run verify:android
```

If passkey operations fail on devices, continue with:
- `docs/platform-setup.md`
- `docs/troubleshooting.md`
