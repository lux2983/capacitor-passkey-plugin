# Gap Matrix (Phase 1.3)

This matrix consolidates:
- Plugin audit (`docs/phase1-plugin-audit.md`)
- Smart Account Kit contracts (`docs/phase1-smart-account-kit-contracts.md`)

It is the source of truth for implementation phases.

## A. Registration response (`RegistrationResponseJSON`) gap matrix

| Field | simplewebauthn expectation | iOS native | Android native | Web implementation | TS type (`PasskeyCreateResult`) | Gap / impact |
|---|---|---|---|---|---|---|
| `id` | required | present | present | present | present | none |
| `rawId` | required | present | present | present | present | none |
| `type` | required (`"public-key"`) | present | present | missing | missing | **explicit gap**; adapter must force value |
| `response.attestationObject` | required for attestation path | present | present | present | present | none |
| `response.clientDataJSON` | required | present | present | present | present | none |
| `response.authenticatorData` | optional but used by kit fallback | missing | currently stripped/absent in shaped output | missing | missing | high impact for key extraction fallback |
| `response.transports` | optional, used by kit storage metadata | missing | missing | missing | missing | high impact for downstream auth hints |
| `response.publicKey` | optional but preferred by kit | missing | currently stripped/absent in shaped output | missing | missing | high impact for robust key extraction |
| `response.publicKeyAlgorithm` | optional | missing | currently stripped/absent in shaped output | missing | missing | medium impact |
| `authenticatorAttachment` | optional | missing | missing | missing | missing | medium impact |
| `clientExtensionResults` | required in SWA JSON contracts | missing | missing | missing | missing | high impact; adapter must default `{}` |

### Explicit `type` status required by plan
- iOS registration: returned.
- Android registration: returned.
- Web registration: missing.
- TypeScript `PasskeyCreateResult`: missing.

## B. Authentication response (`AuthenticationResponseJSON`) gap matrix

| Field | simplewebauthn expectation | iOS native | Android native | Web implementation | TS type (`PasskeyAuthResult`) | Gap / impact |
|---|---|---|---|---|---|---|
| `id` | required | present | present | present | present | none |
| `rawId` | required | present | present | present | present | none |
| `type` | required | present | present | present | present (`string`, not literal) | tighten type to `"public-key"` preferred |
| `response.clientDataJSON` | required | present | present | present | present | none |
| `response.authenticatorData` | required | present | present | present | present | none |
| `response.signature` | required | present | present | present | present | none |
| `response.userHandle` | optional | optional | optional | optional | optional | none |
| `authenticatorAttachment` | optional | missing | missing | missing | missing | medium impact |
| `clientExtensionResults` | required in SWA JSON contracts | missing | missing | missing | missing | high impact; adapter must default `{}` |

## C. Error code mapping matrix (plugin -> DOMException-compatible)

| Plugin code | Expected DOMException name | Notes |
|---|---|---|
| `CANCELLED` | `NotAllowedError` | user cancellation path |
| `TIMEOUT` | `AbortError` | timeout-like interruption |
| `NO_CREDENTIAL` | `NotAllowedError` | no eligible credential selected/found |
| `UNSUPPORTED_ERROR` | `NotSupportedError` | capability/platform unsupported |
| `INVALID_INPUT` | `TypeError` | malformed inputs |
| `RPID_VALIDATION_ERROR` | `SecurityError` | iOS-specific domain mapping |
| `DOM_ERROR` | context-dependent (`SecurityError`/`InvalidStateError`/fallback `NotAllowedError`) | catch-all; requires message-aware mapping |
| `UNKNOWN_ERROR` | `UnknownError` | opaque fallback |
| `PROVIDER_CONFIG_ERROR` | `InvalidStateError` | Android provider configuration |
| `INTERRUPTED` | `AbortError` | Android interruption path |
| `NO_ACTIVITY` | `InvalidStateError` | Android lifecycle/host state issue |

## D. StorageAdapter vs Capacitor storage APIs

Smart Account Kit requires 10 methods with credential and session persistence.

Expected Capacitor Preferences APIs to leverage:
- `Preferences.get({ key })`
- `Preferences.set({ key, value })`
- `Preferences.remove({ key })`
- `Preferences.keys()`
- `Preferences.clear()`

Implementation implications:
- No native query-by-prefix API; adapter needs its own credential index key.
- `Uint8Array` (`StoredCredential.publicKey`) must be serialized to/from string safely (base64 preferred).
- Namespacing required to avoid collisions (e.g. `capacitor-passkey:*`).

## E. Options mapping: kit `optionsJSON` -> plugin `{ publicKey: ... }`

## Registration options

| Kit/SWA (`PublicKeyCredentialCreationOptionsJSON`) | Plugin `PublicKeyCreationOptions` | Status |
|---|---|---|
| `challenge` | `challenge` | pass-through |
| `rp` | `rp` | pass-through |
| `user` | `user` | pass-through |
| `pubKeyCredParams` | `pubKeyCredParams` | pass-through |
| `authenticatorSelection` | `authenticatorSelection` | pass-through |
| `timeout` | `timeout` | pass-through |
| `attestation` | `attestation` | pass-through |
| `extensions` | `extensions` | pass-through |
| `excludeCredentials` | `excludeCredentials` | pass-through |
| `hints` / `attestationFormats` (if provided by caller/tooling) | not declared in plugin types | currently untyped/ignored unless passed through structurally |

## Authentication options

| Kit/SWA (`PublicKeyCredentialRequestOptionsJSON`) | Plugin `PublicKeyAuthenticationOptions` | Status |
|---|---|---|
| `challenge` | `challenge` | pass-through |
| `allowCredentials` | `allowCredentials` | pass-through |
| `rpId` | `rpId` | pass-through |
| `timeout` | `timeout` | pass-through |
| `userVerification` | `userVerification` | pass-through |
| `extensions` | `extensions` | pass-through |
| `hints` (if provided by caller/tooling) | not declared in plugin types | currently untyped/ignored unless passed through structurally |
| `authenticatorAttachment` | supported natively but missing in TS request type | **type gap** |

Adapter wrapping requirement:
- Kit calls `startRegistration({ optionsJSON })` / `startAuthentication({ optionsJSON })`.
- Plugin expects `{ publicKey: optionsJSON }`.
- Adapter must do this wrapper conversion.

## F. Test coverage gaps

| Area | Current state | Gap |
|---|---|---|
| iOS unit tests | substantial, model-focused | still needs response enrichment/hybrid-path coverage after changes |
| Android unit tests | template-only example tests | no plugin behavior coverage |
| TypeScript unit tests | none | no adapter/web/error/storage tests; no TS test runner |

## G. Build/configuration gaps

| Area | Current state | Gap |
|---|---|---|
| `tsconfig.json` scope | `files: ["src/index.ts"]` | new modules (`adapter`, `storage`, `errors`) excluded unless changed |
| `package.json` exports | only `.` and `./package.json` | missing `./adapter` and `./storage` entry points |
| Rollup inputs | single `dist/esm/index.js` | acceptable for plugin bundle, but adapter/storage rely on `tsc` outputs |
| Test infra | no TS test script or config | add Vitest + config + tests |
| iOS source layout | canonical + stale duplicate dir | stale `PasskeyPlugin/` should be cleaned or explicitly ignored |

## H. Prioritized implementation order
1. Fix build/test infrastructure (tsconfig scope + exports + test runner).
2. Align response shapes (all platforms + TS interfaces).
3. Add adapter + error mapping layer.
4. Add storage adapter.
5. Add Android + TS test coverage.
6. Complete docs, CI, and packaging checks.
