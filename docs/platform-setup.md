# Platform Setup

This guide covers native platform configuration required for passkeys in Capacitor apps.

## iOS Setup

### 1. Add Associated Domains

In Xcode:

1. Open `ios/App/App.xcworkspace`
2. Select your app target
3. Open `Signing & Capabilities`
4. Add capability: `Associated Domains`
5. Add entry: `webcredentials:<rpId>` (example: `webcredentials:soneso.com`)

This must match the `rpId` used by Smart Account Kit.

### 2. Configure Entitlements

Your app entitlements file should include:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>webcredentials:soneso.com</string>
</array>
```

### 3. Host Apple App Site Association

Host one of the following (no redirects):

- `https://<rpId>/.well-known/apple-app-site-association`
- `https://<rpId>/apple-app-site-association`

Example:

```json
{
  "webcredentials": {
    "apps": ["TEAMID.com.example.app"]
  }
}
```

Requirements:
- HTTPS
- `200 OK`
- Valid JSON
- Correct Team ID + bundle identifier

### 4. Add Face ID Usage Description

In `Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to authenticate your passkey.</string>
```

### 5. Provisioning Profile Requirements

For device testing, the provisioning profile must include:
- Associated Domains entitlement
- Matching bundle identifier
- Correct Team ID

After capability changes, regenerate/re-download profiles and rebuild.

### 6. iOS Common Errors

- `RPID_VALIDATION_ERROR`
  - `rpId` does not match `webcredentials:` domain
  - AASA file missing/invalid/unreachable
  - app id in AASA does not match installed app
- Passkey sheet does not appear
  - running without proper entitlement/profile
  - no passkey-capable credential provider on device

## Android Setup

### 1. Add Digital Asset Links Statement Reference

In `android/app/src/main/res/values/strings.xml`:

```xml
<string name="asset_statements" translatable="false">
[{"include":"https://soneso.com/.well-known/assetlinks.json"}]
</string>
```

Replace with your `rpId` domain.

### 2. Configure AndroidManifest

In `android/app/src/main/AndroidManifest.xml`:

- Add an auto-verified HTTPS intent filter on the main activity
- Add metadata referencing `asset_statements`
- Add NFC permission for hardware keys (YubiKey)

Example (inside `<activity ...>`):

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" />
  <data android:host="soneso.com" />
</intent-filter>

<meta-data
  android:name="asset_statements"
  android:resource="@string/asset_statements" />
```

Example permission:

```xml
<uses-permission android:name="android.permission.NFC" />
```

### 3. Host `assetlinks.json`

Host at `https://<rpId>/.well-known/assetlinks.json`.

Example:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:..."
      ]
    }
  }
]
```

### 4. Get SHA-256 Fingerprints

Debug key:

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

Release key:

```bash
keytool -list -v -keystore /path/to/release.keystore -alias <alias>
```

Include every signing certificate used for installed builds.

### 5. Credential Manager Requirements

- Android 9 (API 28)+
- Updated Google Play Services
- Device lock screen configured

### 6. Android Common Errors

- `PROVIDER_CONFIG_ERROR`
  - provider unavailable/misconfigured
  - outdated Play Services
- No credentials found / prompt missing
  - asset links not verified for the installed package/signing cert
  - `rpId` mismatch between app config and server files
- YubiKey NFC unavailable
  - NFC hardware off/unsupported
  - missing NFC permission

## Verify Configuration

Run native checks after each configuration change:

```bash
npm run verify:ios
npm run verify:android
```

For end-to-end passkey validation, test on physical devices.
