# Phase 1.2 Smart Account Kit Contract Extraction

## Source repository
`smart-account-kit` (read-only reference).

## Package contract baseline
- Smart Account Kit version: `0.2.9`
- `@simplewebauthn/browser` dependency: `^13.2.2` (from `smart-account-kit/package.json`)

## WebAuthn config contract (`SmartAccountConfig.webAuthn`)
From `smart-account-kit/src/types.ts`:

```ts
webAuthn?: {
  startRegistration: (options: {
    optionsJSON: PublicKeyCredentialCreationOptionsJSON;
    useAutoRegister?: boolean;
  }) => Promise<RegistrationResponseJSON>;
  startAuthentication: (options: {
    optionsJSON: PublicKeyCredentialRequestOptionsJSON;
    useBrowserAutofill?: boolean;
    verifyBrowserAutofillInput?: boolean;
  }) => Promise<AuthenticationResponseJSON>;
};
```

### Runtime usage detail
- Internal operational paths (`src/kit/webauthn-ops.ts`, `src/kit/wallet-ops.ts`) call:
  - `startRegistration({ optionsJSON })`
  - `startAuthentication({ optionsJSON })`
- Optional browser-compat flags (`useAutoRegister`, `useBrowserAutofill`, `verifyBrowserAutofillInput`) are part of the external type contract but not currently passed by kit internals.

## Storage contract (`StorageAdapter`)
From `smart-account-kit/src/types.ts`:

```ts
save(credential: StoredCredential): Promise<void>
get(credentialId: string): Promise<StoredCredential | null>
getByContract(contractId: string): Promise<StoredCredential[]>
getAll(): Promise<StoredCredential[]>
delete(credentialId: string): Promise<void>
update(
  credentialId: string,
  updates: Partial<Omit<StoredCredential, "credentialId" | "publicKey">>
): Promise<void>
clear(): Promise<void>
saveSession(session: StoredSession): Promise<void>
getSession(): Promise<StoredSession | null>
clearSession(): Promise<void>
```

## Stored data contracts

### `StoredCredential`
From `smart-account-kit/src/types.ts`:
- `credentialId: string`
- `publicKey: Uint8Array`
- `contractId: string`
- `nickname?: string`
- `createdAt: number`
- `lastUsedAt?: number`
- `transports?: AuthenticatorTransportFuture[]`
- `deviceType?: "singleDevice" | "multiDevice"`
- `backedUp?: boolean`
- `contextRuleId?: number`
- `isPrimary?: boolean`
- `deploymentStatus?: CredentialDeploymentStatus`
- `deploymentError?: string`

### `StoredSession`
From `smart-account-kit/src/types.ts`:
- `contractId: string`
- `credentialId: string`
- `connectedAt: number`
- `expiresAt?: number`

## Fields actually consumed by kit logic

### Registration response (`RegistrationResponseJSON`)
- `webauthn-ops.ts:createPasskey()` passes `rawResponse.response` to `extractPublicKeyFromAttestation()`.
- `utils.ts:extractPublicKeyFromAttestation()` consumes in order:
  1. `response.publicKey` (preferred)
  2. `response.authenticatorData` (fallback)
  3. `response.attestationObject` (fallback)
- `wallet-ops.ts:createWallet()`, `managers/credential-manager.ts:create()`, `managers/signer-manager.ts:addPasskey()` consume `rawResponse.response.transports` for storage metadata.

### Authentication response (`AuthenticationResponseJSON`)
- `webauthn-ops.ts:signAuthEntry()` consumes:
  - `id`
  - `response.signature`
  - `response.authenticatorData`
  - `response.clientDataJSON`
- `wallet-ops.ts:connectWallet()` consumes `rawResponse.id`.

## Error handling expectations in kit
- Kit code generally propagates WebAuthn errors rather than mapping plugin-specific error codes.
- Therefore adapter-level mapping to DOMException-compatible names is needed to maintain behavioral parity with `@simplewebauthn/browser` callers.
