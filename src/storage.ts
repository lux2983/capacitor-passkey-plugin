import type { AuthenticatorTransportFuture } from '@simplewebauthn/browser';
import { Preferences } from '@capacitor/preferences';

export type CredentialDeploymentStatus = 'pending' | 'failed';

export interface StoredSession {
  contractId: string;
  credentialId: string;
  connectedAt: number;
  expiresAt?: number;
}

export interface StoredCredential {
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

export interface StorageAdapter {
  save(credential: StoredCredential): Promise<void>;
  get(credentialId: string): Promise<StoredCredential | null>;
  getByContract(contractId: string): Promise<StoredCredential[]>;
  getAll(): Promise<StoredCredential[]>;
  delete(credentialId: string): Promise<void>;
  update(credentialId: string, updates: Partial<Omit<StoredCredential, 'credentialId' | 'publicKey'>>): Promise<void>;
  clear(): Promise<void>;
  saveSession(session: StoredSession): Promise<void>;
  getSession(): Promise<StoredSession | null>;
  clearSession(): Promise<void>;
}

type PreferencesAPI = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
};

type SerializedCredential = Omit<StoredCredential, 'publicKey'> & {
  publicKey: string;
};

const DEFAULT_PREFIX = 'capacitor-passkey';

function getGlobalBuffer(): any {
  return (globalThis as any).Buffer;
}

function toBase64(input: Uint8Array): string {
  const binary = Array.from(input, (byte) => String.fromCharCode(byte)).join('');

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  const globalBuffer = getGlobalBuffer();
  if (!globalBuffer) {
    throw new Error('No base64 encoder available in this runtime');
  }

  return globalBuffer.from(binary, 'binary').toString('base64');
}

function fromBase64(input: string): Uint8Array {
  let binary: string;

  if (typeof atob === 'function') {
    binary = atob(input);
  } else {
    const globalBuffer = getGlobalBuffer();
    if (!globalBuffer) {
      throw new Error('No base64 decoder available in this runtime');
    }
    binary = globalBuffer.from(input, 'base64').toString('binary');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function serializeCredential(credential: StoredCredential): SerializedCredential {
  return {
    ...credential,
    publicKey: toBase64(credential.publicKey),
  };
}

function deserializeCredential(payload: SerializedCredential): StoredCredential {
  return {
    ...payload,
    publicKey: fromBase64(payload.publicKey),
  };
}

/**
 * Storage adapter compatible with Smart Account Kit StorageAdapter contract.
 *
 * Uses @capacitor/preferences for persistence and maintains its own credential index
 * because Preferences does not provide prefix queries.
 */
export class CapacitorStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  constructor(prefix: string = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  async save(credential: StoredCredential): Promise<void> {
    const preferences = await this.getPreferences();
    const index = await this.getCredentialIndex(preferences);
    const serialized = JSON.stringify(serializeCredential(credential));

    await preferences.set({
      key: this.credentialKey(credential.credentialId),
      value: serialized,
    });

    if (!index.includes(credential.credentialId)) {
      index.push(credential.credentialId);
      await this.setCredentialIndex(preferences, index);
    }
  }

  async get(credentialId: string): Promise<StoredCredential | null> {
    const preferences = await this.getPreferences();
    const value = await preferences.get({ key: this.credentialKey(credentialId) });

    if (!value.value) {
      return null;
    }

    try {
      return deserializeCredential(JSON.parse(value.value) as SerializedCredential);
    } catch {
      return null;
    }
  }

  async getByContract(contractId: string): Promise<StoredCredential[]> {
    const all = await this.getAll();
    return all.filter((credential) => credential.contractId === contractId);
  }

  async getAll(): Promise<StoredCredential[]> {
    const preferences = await this.getPreferences();
    const index = await this.getCredentialIndex(preferences);
    const results: StoredCredential[] = [];

    for (const credentialId of index) {
      const credential = await this.get(credentialId);
      if (credential) {
        results.push(credential);
      }
    }

    return results;
  }

  async delete(credentialId: string): Promise<void> {
    const preferences = await this.getPreferences();
    const index = await this.getCredentialIndex(preferences);

    await preferences.remove({ key: this.credentialKey(credentialId) });

    const next = index.filter((id) => id !== credentialId);
    await this.setCredentialIndex(preferences, next);
  }

  async update(
    credentialId: string,
    updates: Partial<Omit<StoredCredential, 'credentialId' | 'publicKey'>>,
  ): Promise<void> {
    const credential = await this.get(credentialId);
    if (!credential) {
      return;
    }

    await this.save({
      ...credential,
      ...updates,
      credentialId: credential.credentialId,
      publicKey: credential.publicKey,
    });
  }

  async clear(): Promise<void> {
    const preferences = await this.getPreferences();
    const index = await this.getCredentialIndex(preferences);

    for (const credentialId of index) {
      await preferences.remove({ key: this.credentialKey(credentialId) });
    }

    await preferences.remove({ key: this.indexKey() });
    await preferences.remove({ key: this.sessionKey() });
  }

  async saveSession(session: StoredSession): Promise<void> {
    const preferences = await this.getPreferences();
    await preferences.set({
      key: this.sessionKey(),
      value: JSON.stringify(session),
    });
  }

  async getSession(): Promise<StoredSession | null> {
    const preferences = await this.getPreferences();
    const value = await preferences.get({ key: this.sessionKey() });

    if (!value.value) {
      return null;
    }

    try {
      return JSON.parse(value.value) as StoredSession;
    } catch {
      return null;
    }
  }

  async clearSession(): Promise<void> {
    const preferences = await this.getPreferences();
    await preferences.remove({ key: this.sessionKey() });
  }

  private async getPreferences(): Promise<PreferencesAPI> {
    return Preferences as PreferencesAPI;
  }

  private credentialKey(credentialId: string): string {
    return `${this.prefix}:credential:${credentialId}`;
  }

  private indexKey(): string {
    return `${this.prefix}:credentials-index`;
  }

  private sessionKey(): string {
    return `${this.prefix}:session`;
  }

  private async getCredentialIndex(preferences: PreferencesAPI): Promise<string[]> {
    const stored = await preferences.get({ key: this.indexKey() });

    if (!stored.value) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored.value) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async setCredentialIndex(preferences: PreferencesAPI, index: string[]): Promise<void> {
    await preferences.set({
      key: this.indexKey(),
      value: JSON.stringify(index),
    });
  }
}
