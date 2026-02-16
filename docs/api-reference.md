# API Reference

## Module: `capacitor-passkey-plugin`

### `PasskeyPlugin`

Cross-platform plugin interface.

#### `createPasskey(options)`

```ts
createPasskey(options: PasskeyCreateOptions): Promise<PasskeyCreateResult>
```

Creates a WebAuthn credential (passkey).

#### `authenticate(options)`

```ts
authenticate(options: PasskeyAuthenticationOptions): Promise<PasskeyAuthResult>
```

Performs passkey authentication (assertion).

## Module: `capacitor-passkey-plugin/adapter`

### `asSimpleWebAuthn(plugin)`

Adapts `PasskeyPlugin` to the `smart-account-kit`/SimpleWebAuthn-style interface.

```ts
asSimpleWebAuthn(plugin: PasskeyPlugin): {
  startRegistration: (options: {
    optionsJSON: PublicKeyCredentialCreationOptionsJSON;
    useAutoRegister?: boolean;
  }) => Promise<RegistrationResponseJSON>;
  startAuthentication: (options: {
    optionsJSON: PublicKeyCredentialRequestOptionsJSON;
    useBrowserAutofill?: boolean;
    verifyBrowserAutofillInput?: boolean;
  }) => Promise<AuthenticationResponseJSON>;
}
```

Behavior:
- Converts plugin response payloads into SimpleWebAuthn-compatible JSON.
- Normalizes optional fields (`authenticatorAttachment`, `transports`, `userHandle`).
- Throws mapped passkey errors (see `PasskeyError`).

## Module: `capacitor-passkey-plugin/storage`

### `CapacitorStorageAdapter`

Storage adapter implementation using `@capacitor/preferences`.

```ts
new CapacitorStorageAdapter(prefix?: string)
```

- Default prefix: `capacitor-passkey`
- Requires `@capacitor/preferences` installed.

#### Methods

1. `save(credential: StoredCredential): Promise<void>`
2. `get(credentialId: string): Promise<StoredCredential | null>`
3. `getByContract(contractId: string): Promise<StoredCredential[]>`
4. `getAll(): Promise<StoredCredential[]>`
5. `delete(credentialId: string): Promise<void>`
6. `update(credentialId: string, updates: Partial<Omit<StoredCredential, 'credentialId' | 'publicKey'>>): Promise<void>`
7. `clear(): Promise<void>`
8. `saveSession(session: StoredSession): Promise<void>`
9. `getSession(): Promise<StoredSession | null>`
10. `clearSession(): Promise<void>`

Notes:
- Credentials are indexed explicitly because Preferences has no prefix query API.
- `publicKey` is serialized to base64 for persistence and restored to `Uint8Array` on read.

## Errors

### `PasskeyError`

Runtime error shape produced by adapter mapping (`mapPluginError` in `src/errors.ts`):

```ts
class PasskeyError extends Error {
  readonly name: string;
  readonly pluginErrorCode: string;
}
```

- `name` follows DOM-style error names (`NotAllowedError`, `AbortError`, `SecurityError`, ...)
- `pluginErrorCode` carries plugin-specific classification

### `PluginErrorCode`

```ts
type PluginErrorCode =
  | 'UNKNOWN_ERROR'
  | 'CANCELLED'
  | 'DOM_ERROR'
  | 'UNSUPPORTED_ERROR'
  | 'TIMEOUT'
  | 'NO_CREDENTIAL'
  | 'INVALID_INPUT'
  | 'RPID_VALIDATION_ERROR'
  | 'PROVIDER_CONFIG_ERROR'
  | 'INTERRUPTED'
  | 'NO_ACTIVITY';
```

### Error Code Mapping

| Plugin Code | Mapped Error Name |
|---|---|
| `UNKNOWN_ERROR` | `UnknownError` |
| `CANCELLED` | `NotAllowedError` |
| `DOM_ERROR` | `NotAllowedError` (or inferred DOM name from message) |
| `UNSUPPORTED_ERROR` | `NotSupportedError` |
| `TIMEOUT` | `AbortError` |
| `NO_CREDENTIAL` | `NotAllowedError` |
| `INVALID_INPUT` | `TypeError` |
| `RPID_VALIDATION_ERROR` | `SecurityError` |
| `PROVIDER_CONFIG_ERROR` | `InvalidStateError` |
| `INTERRUPTED` | `AbortError` |
| `NO_ACTIVITY` | `InvalidStateError` |

## Core Type Definitions

### Request Types

#### `PasskeyCreateOptions`

```ts
interface PasskeyCreateOptions {
  publicKey: PublicKeyCreationOptions;
}
```

#### `PublicKeyCreationOptions`

```ts
interface PublicKeyCreationOptions {
  challenge: string;
  rp: PublicKeyCredentialRpEntity;
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
  excludeCredentials?: {
    id: string;
    type: string;
    transports?: AuthenticatorTransport[];
  }[];
}
```

#### `PasskeyAuthenticationOptions`

```ts
interface PasskeyAuthenticationOptions {
  publicKey: PublicKeyAuthenticationOptions;
}
```

#### `PublicKeyAuthenticationOptions`

```ts
interface PublicKeyAuthenticationOptions {
  challenge: string;
  allowCredentials?: {
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransport[];
  }[];
  rpId?: string;
  authenticatorAttachment?: 'platform' | 'cross-platform';
  timeout?: number;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  extensions?: AuthenticationExtensionsClientInputs;
}
```

### Response Types

#### `PasskeyCreateResult`

```ts
interface PasskeyCreateResult {
  id: string;
  rawId: string;
  type: 'public-key';
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults?: any;
  response: {
    attestationObject: string;
    clientDataJSON: string;
    authenticatorData?: string;
    transports?: string[];
    publicKey?: string;
    publicKeyAlgorithm?: number;
  };
}
```

#### `PasskeyAuthResult`

```ts
interface PasskeyAuthResult {
  id: string;
  rawId: string;
  type: 'public-key';
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults?: any;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
}
```

### Storage Types

#### `StoredSession`

```ts
interface StoredSession {
  contractId: string;
  credentialId: string;
  connectedAt: number;
  expiresAt?: number;
}
```

#### `StoredCredential`

```ts
type CredentialDeploymentStatus = 'pending' | 'failed';

interface StoredCredential {
  credentialId: string;
  publicKey: Uint8Array;
  contractId: string;
  nickname?: string;
  createdAt: number;
  lastUsedAt?: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType?: 'singleDevice' | 'multiDevice';
  backedUp?: boolean;
  contextRuleId?: number;
  isPrimary?: boolean;
  deploymentStatus?: CredentialDeploymentStatus;
  deploymentError?: string;
}
```

#### `StorageAdapter`

```ts
interface StorageAdapter {
  save(credential: StoredCredential): Promise<void>;
  get(credentialId: string): Promise<StoredCredential | null>;
  getByContract(contractId: string): Promise<StoredCredential[]>;
  getAll(): Promise<StoredCredential[]>;
  delete(credentialId: string): Promise<void>;
  update(
    credentialId: string,
    updates: Partial<Omit<StoredCredential, 'credentialId' | 'publicKey'>>,
  ): Promise<void>;
  clear(): Promise<void>;
  saveSession(session: StoredSession): Promise<void>;
  getSession(): Promise<StoredSession | null>;
  clearSession(): Promise<void>;
}
```
