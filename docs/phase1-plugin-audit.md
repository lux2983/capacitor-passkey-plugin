# Phase 1.1 Plugin Audit (capacitor-passkey-plugin)

## Scope
Audit covers TypeScript, Web, iOS, and Android implementations plus build/test configuration in the current `main` branch.

## Repository snapshot
- Plugin version: `0.0.5` (`package.json`)
- Main TS entrypoints: `src/index.ts`, `src/definitions.ts`, `src/web.ts`
- iOS native source: `ios/Sources/PasskeyPlugin/*`
- Android native source: `android/src/main/java/com/argonavisdev/capacitorpasskeyplugin/PasskeyPlugin.kt`

## Response shape by platform

### Registration (`createPasskey`)
- iOS native returns: `id`, `rawId`, `type`, `response.attestationObject`, `response.clientDataJSON`.
- Android native returns: `id`, `rawId`, `type`, `response.attestationObject`, `response.clientDataJSON`.
- Web implementation returns: `id`, `rawId`, `response.attestationObject`, `response.clientDataJSON` (no `type`).
- TS interface `PasskeyCreateResult` includes: `id`, `rawId`, `response.attestationObject`, `response.clientDataJSON` (no `type`).

### Authentication (`authenticate`)
- iOS native returns: `id`, `rawId`, `type`, `response.clientDataJSON`, `response.authenticatorData`, `response.signature`, optional `response.userHandle`.
- Android native returns: `id`, `rawId`, `type`, `response.clientDataJSON`, `response.authenticatorData`, `response.signature`, optional `response.userHandle`.
- Web implementation returns: `id`, `rawId`, `type`, `response.clientDataJSON`, `response.authenticatorData`, `response.signature`, optional `response.userHandle`.
- TS interface `PasskeyAuthResult` includes the above fields.

### Cross-platform inconsistencies
- `type: "public-key"` is returned by native registration paths but omitted from TS `PasskeyCreateResult` and omitted by web registration.
- Neither registration nor authentication currently expose `clientExtensionResults` or `authenticatorAttachment`.
- Registration currently omits `response.authenticatorData`, `response.transports`, `response.publicKey`, `response.publicKeyAlgorithm`.

## Error model

### Error codes present
- iOS: `UNKNOWN_ERROR`, `CANCELLED`, `DOM_ERROR`, `UNSUPPORTED_ERROR`, `TIMEOUT`, `NO_CREDENTIAL`, `INVALID_INPUT`, `RPID_VALIDATION_ERROR`.
- Android: `UNKNOWN_ERROR`, `CANCELLED`, `DOM_ERROR`, `NO_ACTIVITY`, `UNSUPPORTED_ERROR`, `PROVIDER_CONFIG_ERROR`, `INTERRUPTED`, `NO_CREDENTIAL`, `TIMEOUT`, `INVALID_INPUT`.
- Web: `UNKNOWN_ERROR`, `CANCELLED`, `DOM_ERROR`, `UNSUPPORTED_ERROR`, `TIMEOUT`, `NO_CREDENTIAL`.

### Error handling notes
- iOS maps by `NSError.domain` + `ASAuthorizationError` enum in `PasskeyPlugin.swift`.
- Android maps by `CreateCredentialException`/`GetCredentialException` subclasses.
- Web maps `DOMException.name` to plugin codes.
- No shared TS adapter-level DOMException-compatible wrapper exists yet.

## Option handling audit

### `authenticatorSelection`
- iOS registration: parsed from `authenticatorSelection` and mapped for platform vs security-key providers.
- Android registration: reads `authenticatorSelection.authenticatorAttachment`; validates values.
- Web registration: forwards `authenticatorSelection` to browser API.

### Authentication `authenticatorAttachment`
- iOS authentication: supports top-level `authenticatorAttachment` in native option model.
- Android authentication: reads top-level `authenticatorAttachment`; validates values.
- TS `PublicKeyAuthenticationOptions` currently does not expose `authenticatorAttachment`.

### `residentKey`
- iOS: strongly typed enum conversion (`discouraged|preferred|required`).
- Android: currently not explicitly validated.

### `allowCredentials`
- iOS: decodes list and maps descriptors for platform/security-key requests.
- Android: forwards JSON to Credential Manager and logs missing transports for cross-platform usage.
- Web: decodes base64url IDs and forwards typed descriptors.

## Transport handling
- Input transports are parsed on all platforms for credential descriptors.
- iOS transport enum includes `hybrid`, but `toAppleTransport()` returns `nil` for `hybrid`.
- Registration output transports are not returned today.

## Test coverage audit
- iOS: substantial unit tests in `ios/Tests/PasskeyPluginTests/PasskeyPluginTests.swift` (data encoding/decoding, model parsing, transport conversion, error enum values).
- Android: only template tests (`ExampleUnitTest`, `ExampleInstrumentedTest`), no plugin behavior coverage.
- TypeScript: no test runner or test files.

## Build and packaging audit
- Build pipeline: `docgen -> tsc -> rollup` (`npm run build`).
- `tsconfig.json` uses `files: ["src/index.ts"]`, which excludes new source files unless updated.
- Rollup bundles only `dist/esm/index.js` into `dist/plugin.js` and `dist/plugin.cjs.js`.
- `exports` only exposes `.` and `./package.json` (no `./adapter` or `./storage`).
- `prepublishOnly` runs `npm run build`.

## Additional findings
- Duplicate/stale iOS source directory exists at top level: `PasskeyPlugin/`.
  - It contains older, smaller files than `ios/Sources/PasskeyPlugin/`.
  - Canonical source is `ios/Sources/PasskeyPlugin/`.
  - Stale directory should be flagged for cleanup in later phases.
