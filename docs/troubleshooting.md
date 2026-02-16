# Troubleshooting

## 1. `rpId` mismatch between app and server

Symptoms:
- iOS returns `RPID_VALIDATION_ERROR`
- Android does not show expected credentials

Checks:
- App `rpId` exactly matches configured domain (`soneso.com` vs `www.soneso.com` are different)
- iOS entitlement contains `webcredentials:<rpId>`
- `apple-app-site-association` and `assetlinks.json` are hosted for the same `rpId`

Fix:
- Align all values to one canonical domain and redeploy association files.

## 2. iOS Associated Domains not working in development

Symptoms:
- Works on one build, fails on another
- Passkey sheet does not appear on device

Notes:
- Associated Domains do not work with localhost domains.
- Simulator is useful for build checks, but real passkey validation should be on a physical device.

Fixes:
- Use a real HTTPS domain for `rpId`.
- Ensure device build uses a provisioning profile that includes Associated Domains.
- Reinstall the app after entitlement/profile changes.
- If needed, clear Associated Domains cache in iOS developer settings.

## 3. Android Digital Asset Links verification failing

Symptoms:
- Credential prompt missing or empty
- Provider reports no available credentials

Checks:
- `https://<rpId>/.well-known/assetlinks.json` returns `200` and valid JSON
- `package_name` matches installed app id
- `sha256_cert_fingerprints` includes the exact signing cert for installed build
- `asset_statements` metadata points to the same domain

Fix:
- Add missing SHA-256 fingerprints (debug/release as needed) and redeploy.

## 4. YubiKey NFC not detected on Android

Symptoms:
- External key prompt appears but NFC interaction never completes

Checks:
- Device has NFC hardware and NFC is enabled
- App has `<uses-permission android:name="android.permission.NFC" />`
- Key supports FIDO2/WebAuthn over NFC

Fixes:
- Enable NFC and keep key near the NFC antenna area during prompt.
- Test with `authenticatorAttachment: 'cross-platform'`.

## 5. Credential not found after app reinstall

Why it happens:
- Local credential metadata/session is stored in app storage and is cleared on uninstall.
- The passkey may still exist in iCloud Keychain/Google Password Manager, but local mapping can be gone.

Recovery:
- Call `connectWallet({ prompt: true })` to re-authenticate.
- Rebuild local mapping using the returned `credentialId` and indexer/discovery flow.

## 6. Passkey prompt not appearing in WebView contexts

Why it happens:
- Mobile WebViews have limited/unsupported WebAuthn behavior.

Fix:
- Use the native Capacitor plugin (`PasskeyPlugin`) through `asSimpleWebAuthn`.
- Do not rely on direct browser WebAuthn APIs in embedded WebViews.

## 7. Timeout errors during create/authenticate

Symptoms:
- Operation fails with `TIMEOUT`

Fixes:
- Increase `timeout` in WebAuthn options passed through Smart Account Kit.
- Avoid aggressive timeout values when using external authenticators.
- Keep user feedback visible while awaiting OS credential UI.

## 8. Build failures (Capacitor / Gradle / Xcode)

Checks:
- Capacitor 8+ for plugin integration
- Node 18+
- iOS: Xcode with iOS 15+ SDK support
- Android: API 28+ target support, JDK compatible with your AGP version

Useful commands:

```bash
npm run build
npm run verify:ios
npm run verify:android
```

If native projects are out of sync:

```bash
npx cap sync
```

## 9. `PROVIDER_CONFIG_ERROR` on Android

Symptoms:
- Credential Manager fails immediately without prompt

Fixes:
- Update Google Play Services
- Ensure a lock screen is configured
- Retry after device restart if provider state is stale

## 10. Distinguishing cancellation vs configuration issues

`CANCELLED` and `NO_CREDENTIAL` can look similar in UX. Handle them differently:
- `CANCELLED`: user dismissed prompt -> show retry option
- `NO_CREDENTIAL`: nothing matched -> offer wallet creation or different account path
