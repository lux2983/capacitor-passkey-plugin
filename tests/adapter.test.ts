import { describe, expect, it, vi } from 'vitest';
import type { PasskeyPlugin } from '../src/definitions';
import { asSimpleWebAuthn } from '../src/adapter';

describe('asSimpleWebAuthn', () => {
  it('wraps optionsJSON into plugin publicKey for registration', async () => {
    const createPasskey = vi.fn(async () => ({
      id: 'cred-id',
      rawId: 'cred-id',
      type: 'public-key' as const,
      response: {
        attestationObject: 'attestation',
        clientDataJSON: 'client-data',
      },
    }));

    const authenticate = vi.fn();
    const plugin: PasskeyPlugin = { createPasskey, authenticate } as unknown as PasskeyPlugin;

    const adapter = asSimpleWebAuthn(plugin);
    const optionsJSON = {
      challenge: 'challenge',
      rp: { id: 'example.com', name: 'Example' },
      user: { id: 'user', name: 'name', displayName: 'display' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' as const }],
    } as any;

    const result = await adapter.startRegistration({ optionsJSON });

    expect(createPasskey).toHaveBeenCalledWith({ publicKey: optionsJSON });
    expect(result.type).toBe('public-key');
    expect(result.clientExtensionResults).toEqual({});
  });

  it('wraps optionsJSON into plugin publicKey for authentication', async () => {
    const createPasskey = vi.fn();
    const authenticate = vi.fn(async () => ({
      id: 'cred-id',
      rawId: 'cred-id',
      type: 'public-key' as const,
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'auth-data',
        signature: 'sig',
        userHandle: 'null',
      },
    }));

    const plugin: PasskeyPlugin = { createPasskey, authenticate } as unknown as PasskeyPlugin;

    const adapter = asSimpleWebAuthn(plugin);
    const optionsJSON = {
      challenge: 'challenge',
      rpId: 'example.com',
    } as any;

    const result = await adapter.startAuthentication({ optionsJSON });

    expect(authenticate).toHaveBeenCalledWith({ publicKey: optionsJSON });
    expect(result.type).toBe('public-key');
    expect(result.clientExtensionResults).toEqual({});
    expect(result.response.userHandle).toBeUndefined();
  });
});
