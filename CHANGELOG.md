# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Updated iOS SPM dependency to `capacitor-swift-pm` 8.x for Capacitor 8 app compatibility.
- Added `CapacitorPasskeyPlugin` Swift package product alias so Capacitor-generated `CapApp-SPM` resolves plugin linkage without app-side patching.

## [1.0.0] - 2026-02-16

### Added
- Smart Account Kit adapter module export at `capacitor-passkey-plugin/adapter` via `asSimpleWebAuthn()`.
- Capacitor-native storage adapter export at `capacitor-passkey-plugin/storage` via `CapacitorStorageAdapter`.
- Enriched registration/authentication response alignment with SimpleWebAuthn expectations.
- Typed plugin error mapping with `PasskeyError` and `PluginErrorCode` coverage.
- Unit tests for adapter, error mapping, and storage modules.
- Dedicated integration, platform setup, API reference, and troubleshooting documentation.
- CI workflows for plugin and standalone smart account demo repositories.

### Changed
- Package exports now include `./adapter` and `./storage` entry points with declaration files.
- TypeScript request/response definitions were expanded for Smart Account Kit interoperability.
- README and integration guidance were updated to adapter-first usage.
- Repository metadata now points to the maintained fork.

### Fixed
- iOS unsupported authorization error enum handling for current SDK compatibility.
- Storage adapter credential serialization/deserialization robustness and test coverage.
- Lint/format consistency across adapter, errors, storage, web, and tests.
