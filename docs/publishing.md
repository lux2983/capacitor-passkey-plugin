# Publishing

This guide describes how to ship a release build for `capacitor-passkey-plugin`.

## Prerequisites

- Node.js 18+
- npm account with publish rights to the package name
- Clean git working tree

## Manual Release Checklist

1. Verify version and changelog

```bash
node -p "require('./package.json').version"
```

- Confirm `package.json` version is correct.
- Confirm `CHANGELOG.md` includes this release.

2. Run test and verification suite

```bash
npm ci
npm test
npm run build
npm run verify
npm run lint
```

3. Inspect the publish artifact

```bash
npm pack
```

Inspect tarball contents:

```bash
tar -tf capacitor-passkey-plugin-<version>.tgz
```

Verify:
- dist outputs are included
- declaration files are included for all entry points
- test files are excluded
- CI/workflow files are excluded

4. Optional smoke test from tarball in a clean app

```bash
npm install /absolute/path/to/capacitor-passkey-plugin-<version>.tgz
```

Validate imports:
- `capacitor-passkey-plugin`
- `capacitor-passkey-plugin/adapter`
- `capacitor-passkey-plugin/storage`

5. Publish (when allowed)

```bash
npm publish
```

## Optional GitHub Release Workflow

You may add `.github/workflows/release.yml` to:
- run full verification on tags
- run `npm pack` artifact checks
- publish with `NODE_AUTH_TOKEN` secret

If npm publishing is temporarily disabled, stop after `npm pack` and keep release state at "publish-ready".
