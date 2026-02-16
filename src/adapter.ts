import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import type { PasskeyPlugin, PasskeyCreateResult } from './definitions';
import { mapPluginError } from './errors';

type Attachment = 'platform' | 'cross-platform';

function normalizeAttachment(value?: string): Attachment | undefined {
  if (value === 'platform' || value === 'cross-platform') {
    return value;
  }

  return undefined;
}

function normalizeTransports(value?: string[]): AuthenticatorTransportFuture[] | undefined {
  if (!value || value.length === 0) {
    return undefined;
  }

  return value as AuthenticatorTransportFuture[];
}

function normalizeUserHandle(value?: string): string | undefined {
  if (!value || value === 'null' || value === 'undefined') {
    return undefined;
  }

  return value;
}

function fromBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const globalBuffer = (globalThis as any).Buffer;
  if (typeof atob !== 'function' && !globalBuffer) {
    throw new Error('No base64 decoder available in this runtime');
  }

  const binary = typeof atob === 'function'
    ? atob(base64)
    : globalBuffer.from(base64, 'base64').toString('binary');

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toBase64Url(input: Uint8Array): string {
  const binary = Array.from(input, (byte) => String.fromCharCode(byte)).join('');
  const globalBuffer = (globalThis as any).Buffer;
  if (typeof btoa !== 'function' && !globalBuffer) {
    throw new Error('No base64 encoder available in this runtime');
  }

  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : globalBuffer.from(binary, 'binary').toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function extractPublicKeyFromRegistrationResponse(
  response: PasskeyCreateResult['response'],
): string | undefined {
  if (response.publicKey) {
    return response.publicKey;
  }

  if (response.authenticatorData) {
    const authenticatorData = fromBase64Url(response.authenticatorData);

    // 32 (rpIdHash) + 1 (flags) + 4 (counter) + 16 (aaguid) = 53, then 2 bytes credential ID length.
    if (authenticatorData.length < 55) {
      return undefined;
    }

    const credentialIdLength = (authenticatorData[53] << 8) | authenticatorData[54];
    const xStart = 55 + credentialIdLength + 10;
    const yStart = 55 + credentialIdLength + 45;

    if (authenticatorData.length < yStart + 32) {
      return undefined;
    }

    const publicKey = new Uint8Array(65);
    publicKey[0] = 0x04;
    publicKey.set(authenticatorData.slice(xStart, xStart + 32), 1);
    publicKey.set(authenticatorData.slice(yStart, yStart + 32), 33);
    return toBase64Url(publicKey);
  }

  if (response.attestationObject) {
    const attestationObject = fromBase64Url(response.attestationObject);
    const cosePrefix = new Uint8Array([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]);

    let startIndex = -1;
    for (let i = 0; i <= attestationObject.length - cosePrefix.length; i += 1) {
      let matched = true;
      for (let j = 0; j < cosePrefix.length; j += 1) {
        if (attestationObject[i + j] !== cosePrefix[j]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        startIndex = i + cosePrefix.length;
        break;
      }
    }

    if (startIndex < 0 || startIndex + 67 > attestationObject.length) {
      return undefined;
    }

    const publicKey = new Uint8Array(65);
    publicKey[0] = 0x04;
    publicKey.set(attestationObject.slice(startIndex, startIndex + 32), 1);
    publicKey.set(attestationObject.slice(startIndex + 35, startIndex + 67), 33);
    return toBase64Url(publicKey);
  }

  return undefined;
}

function normalizeRegistrationResponse(result: PasskeyCreateResult): RegistrationResponseJSON {
  const fallbackPublicKey = extractPublicKeyFromRegistrationResponse(result.response);

  return {
    id: result.id,
    rawId: result.rawId,
    type: 'public-key',
    authenticatorAttachment: normalizeAttachment(result.authenticatorAttachment),
    clientExtensionResults: result.clientExtensionResults ?? {},
    response: {
      attestationObject: result.response.attestationObject,
      clientDataJSON: result.response.clientDataJSON,
      authenticatorData: result.response.authenticatorData,
      transports: normalizeTransports(result.response.transports),
      publicKey: result.response.publicKey ?? fallbackPublicKey,
      publicKeyAlgorithm: result.response.publicKeyAlgorithm,
    },
  };
}

function normalizeAuthenticationResponse(
  result: Awaited<ReturnType<PasskeyPlugin['authenticate']>>,
): AuthenticationResponseJSON {
  return {
    id: result.id,
    rawId: result.rawId,
    type: 'public-key',
    authenticatorAttachment: normalizeAttachment(result.authenticatorAttachment),
    clientExtensionResults: result.clientExtensionResults ?? {},
    response: {
      clientDataJSON: result.response.clientDataJSON,
      authenticatorData: result.response.authenticatorData,
      signature: result.response.signature,
      userHandle: normalizeUserHandle(result.response.userHandle),
    },
  };
}

export function asSimpleWebAuthn(plugin: PasskeyPlugin): {
  startRegistration: (options: {
    optionsJSON: PublicKeyCredentialCreationOptionsJSON;
    useAutoRegister?: boolean;
  }) => Promise<RegistrationResponseJSON>;
  startAuthentication: (options: {
    optionsJSON: PublicKeyCredentialRequestOptionsJSON;
    useBrowserAutofill?: boolean;
    verifyBrowserAutofillInput?: boolean;
  }) => Promise<AuthenticationResponseJSON>;
} {
  return {
    startRegistration: async ({ optionsJSON }: {
      optionsJSON: PublicKeyCredentialCreationOptionsJSON;
      useAutoRegister?: boolean;
    }) => {
      try {
        const result = await plugin.createPasskey({
          publicKey: optionsJSON as unknown as Parameters<PasskeyPlugin['createPasskey']>[0]['publicKey'],
        });

        return normalizeRegistrationResponse(result);
      } catch (error) {
        throw mapPluginError(error);
      }
    },

    startAuthentication: async ({ optionsJSON }: {
      optionsJSON: PublicKeyCredentialRequestOptionsJSON;
      useBrowserAutofill?: boolean;
      verifyBrowserAutofillInput?: boolean;
    }) => {
      try {
        const result = await plugin.authenticate({
          publicKey: optionsJSON as unknown as Parameters<PasskeyPlugin['authenticate']>[0]['publicKey'],
        });

        return normalizeAuthenticationResponse(result);
      } catch (error) {
        throw mapPluginError(error);
      }
    },
  };
}
