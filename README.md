# Capacitor Passkey Plugin

Cross-platform passkey plugin for Capacitor (iOS, Android, Web) with Smart Account Kit integration support.

## Features

- Native passkey create/authenticate via iOS AuthenticationServices and Android Credential Manager
- Adapter for `smart-account-kit` / SimpleWebAuthn-compatible APIs
- Capacitor-native `StorageAdapter` for credential + session persistence
- Standardized error mapping across platforms
- Support for platform authenticators and cross-platform security keys (YubiKey)

## Installation

```bash
npm install capacitor-passkey-plugin
npm install @capacitor/preferences
npx cap sync
```

`@capacitor/preferences` is required for `CapacitorStorageAdapter`.

## Quick Start (Smart Account Kit)

```ts
import { SmartAccountKit } from 'smart-account-kit';
import { PasskeyPlugin } from 'capacitor-passkey-plugin';
import { asSimpleWebAuthn } from 'capacitor-passkey-plugin/adapter';
import { CapacitorStorageAdapter } from 'capacitor-passkey-plugin/storage';

const kit = new SmartAccountKit({
  rpcUrl: import.meta.env.VITE_RPC_URL,
  networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
  accountWasmHash: import.meta.env.VITE_ACCOUNT_WASM_HASH,
  webauthnVerifierAddress: import.meta.env.VITE_WEBAUTHN_VERIFIER_ADDRESS,
  rpId: import.meta.env.VITE_PASSKEY_RP_ID,
  rpName: import.meta.env.VITE_PASSKEY_RP_NAME,
  storage: new CapacitorStorageAdapter('smart-account-demo'),
  webAuthn: asSimpleWebAuthn(PasskeyPlugin),
});
```

## Requirements

| Platform | Minimum |
|---|---|
| iOS | 15.0 |
| Android | API 28 |
| Capacitor | 8.0.0 |
| Node.js | 18.0.0 |

## Error Handling

Adapter-thrown errors include a mapped DOM-style `name` and `pluginErrorCode`.

- `CANCELLED`
- `TIMEOUT`
- `NO_CREDENTIAL`
- `INVALID_INPUT`
- `RPID_VALIDATION_ERROR`
- `PROVIDER_CONFIG_ERROR`
- `UNSUPPORTED_ERROR`
- `DOM_ERROR`
- `INTERRUPTED`
- `NO_ACTIVITY`
- `UNKNOWN_ERROR`

## Documentation

- [Integration Guide](docs/integration-guide.md)
- [Platform Setup](docs/platform-setup.md)
- [API Reference](docs/api-reference.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Publishing](docs/publishing.md)
- [Architecture](docs/architecture.md)
- [Android Guide](docs/android.md)
- [iOS Guide](docs/ios.md)
- [Web Guide](docs/web.md)

## DeepWiki

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](http://deepwiki.com/Argo-Navis-Dev/capacitor-passkey-plugin/)
