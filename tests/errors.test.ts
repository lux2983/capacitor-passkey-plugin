import { describe, expect, it } from 'vitest';

import { mapPluginError, PasskeyError } from '../src/errors';

describe('mapPluginError', () => {
  it('maps CANCELLED to NotAllowedError', () => {
    const error = mapPluginError({ code: 'CANCELLED', message: 'User cancelled' });
    expect(error).toBeInstanceOf(PasskeyError);
    expect(error.name).toBe('NotAllowedError');
    expect(error.pluginErrorCode).toBe('CANCELLED');
    expect(error.message).toBe('User cancelled');
  });

  it('maps DOM_ERROR by message hint', () => {
    const error = mapPluginError({ code: 'DOM_ERROR', message: 'SecurityError from provider' });
    expect(error.name).toBe('SecurityError');
    expect(error.pluginErrorCode).toBe('DOM_ERROR');
  });

  it('falls back to UnknownError for unknown code', () => {
    const error = mapPluginError({ code: 'WHATEVER', message: 'Unknown failure' });
    expect(error.name).toBe('UnknownError');
    expect(error.pluginErrorCode).toBe('UNKNOWN_ERROR');
  });
});
