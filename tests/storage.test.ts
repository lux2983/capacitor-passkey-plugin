import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacitorStorageAdapter, type StoredCredential } from '../src/storage';

const memory = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    async get({ key }: { key: string }) {
      return { value: memory.has(key) ? memory.get(key)! : null };
    },
    async set({ key, value }: { key: string; value: string }) {
      memory.set(key, value);
    },
    async remove({ key }: { key: string }) {
      memory.delete(key);
    },
  },
}));

function makeCredential(overrides: Partial<StoredCredential> = {}): StoredCredential {
  return {
    credentialId: 'cred-1',
    publicKey: new Uint8Array([1, 2, 3, 4]),
    contractId: 'C123',
    createdAt: 1700000000000,
    ...overrides,
  };
}

describe('CapacitorStorageAdapter', () => {
  beforeEach(() => {
    memory.clear();
  });

  it('saves and retrieves a credential with Uint8Array round-trip', async () => {
    const adapter = new CapacitorStorageAdapter('test-passkey');
    const credential = makeCredential();

    await adapter.save(credential);
    const result = await adapter.get('cred-1');

    expect(result).not.toBeNull();
    expect(result?.credentialId).toBe('cred-1');
    expect(Array.from(result!.publicKey)).toEqual([1, 2, 3, 4]);
  });

  it('filters credentials by contract', async () => {
    const adapter = new CapacitorStorageAdapter('test-passkey');
    await adapter.save(makeCredential({ credentialId: 'cred-1', contractId: 'C1' }));
    await adapter.save(makeCredential({ credentialId: 'cred-2', contractId: 'C2' }));
    await adapter.save(makeCredential({ credentialId: 'cred-3', contractId: 'C1' }));

    const c1 = await adapter.getByContract('C1');
    expect(c1.map((item) => item.credentialId).sort()).toEqual(['cred-1', 'cred-3']);
  });

  it('updates only mutable credential fields', async () => {
    const adapter = new CapacitorStorageAdapter('test-passkey');
    await adapter.save(makeCredential({ nickname: 'before', lastUsedAt: 1 }));

    await adapter.update('cred-1', { nickname: 'after', lastUsedAt: 2 });
    const result = await adapter.get('cred-1');

    expect(result?.nickname).toBe('after');
    expect(result?.lastUsedAt).toBe(2);
    expect(result?.credentialId).toBe('cred-1');
    expect(Array.from(result!.publicKey)).toEqual([1, 2, 3, 4]);
  });

  it('handles session save/get/clear', async () => {
    const adapter = new CapacitorStorageAdapter('test-passkey');

    await adapter.saveSession({
      contractId: 'C1',
      credentialId: 'cred-1',
      connectedAt: 100,
      expiresAt: 200,
    });

    expect(await adapter.getSession()).toEqual({
      contractId: 'C1',
      credentialId: 'cred-1',
      connectedAt: 100,
      expiresAt: 200,
    });

    await adapter.clearSession();
    expect(await adapter.getSession()).toBeNull();
  });

  it('clears credential and session data', async () => {
    const adapter = new CapacitorStorageAdapter('test-passkey');

    await adapter.save(makeCredential({ credentialId: 'cred-1' }));
    await adapter.save(makeCredential({ credentialId: 'cred-2' }));
    await adapter.saveSession({ contractId: 'C1', credentialId: 'cred-1', connectedAt: 1 });

    await adapter.clear();

    expect(await adapter.getAll()).toEqual([]);
    expect(await adapter.getSession()).toBeNull();
  });
});
