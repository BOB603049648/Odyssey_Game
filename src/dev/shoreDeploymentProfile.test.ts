import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readShoreVisualProfile, getShoreVisualProfile } from './shoreVisualProfile';
import { slotAssetUrl } from '../content/assetUrls';

const origin = 'http://47.252.94.138';
const input = { enabled: false, hostname: '47.252.94.138', origin, deploymentOrigin: origin, search: '' };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('explicit origin-pinned production candidate', () => {
  it('defaults only this deployment and exact production origin to normal playable candidate', () => {
    expect(readShoreVisualProfile(input)).toEqual({ variant:'candidate', fixture:null, cat:'S0' });
  });
  it('allows explicit baseline without changing storage or turning it into a fixture', () => {
    expect(readShoreVisualProfile({ ...input, search:'?shoreVisual=baseline' })).toEqual({ variant:'baseline', fixture:null, cat:'S0' });
  });
  it('requires explicit freeze=1 and an allowlisted fixture', () => {
    expect(readShoreVisualProfile({ ...input, search:'?fixture=shore-spawn' }).fixture).toBeNull();
    expect(readShoreVisualProfile({ ...input, search:'?fixture=shore-spawn&freeze=1' }).fixture).toBe('shore-spawn');
    expect(readShoreVisualProfile({ ...input, search:'?shoreVisual=baseline&fixture=south&freeze=1' })).toEqual({ variant:'baseline', fixture:'south', cat:'S0' });
    expect(readShoreVisualProfile({ ...input, search:'?fixture=unknown&freeze=1' }).fixture).toBeNull();
  });
  it('ordinary builds never enable production candidate or fixture even on that exact host', () => {
    expect(readShoreVisualProfile({ ...input, deploymentOrigin: undefined, search:'?shoreVisual=candidate&fixture=south&freeze=1' })).toEqual({ variant:'baseline', fixture:null, cat:'S0' });
  });
  it('does not open other hosts, schemes, ports or an arbitrary deployment flag value', () => {
    for (const value of ['http://example.com', 'https://47.252.94.138', 'http://47.252.94.138:8793']) {
      expect(readShoreVisualProfile({ ...input, origin:value, search:'?shoreVisual=candidate&fixture=south&freeze=1' }).variant).toBe('baseline');
    }
    expect(readShoreVisualProfile({ ...input, origin:'http://example.com', deploymentOrigin:'http://example.com' }).variant).toBe('baseline');
    expect(readShoreVisualProfile({ ...input, deploymentOrigin:'1' }).variant).toBe('baseline');
  });
  it('runtime default, initial asset resolver and explicit baseline all use the same profile', () => {
    vi.stubGlobal('window', { location: new URL(origin) });
    vi.stubEnv('VITE_SHORE_DEPLOY_ORIGIN', origin);
    expect(getShoreVisualProfile().variant).toBe('candidate');
    expect(slotAssetUrl('art.shore.ground')).toContain('art.shore.ground.clean');
    vi.stubGlobal('window', { location: new URL(origin+'/?shoreVisual=baseline') });
    expect(getShoreVisualProfile().variant).toBe('baseline');
    expect(slotAssetUrl('art.shore.ground')).not.toContain('ground.clean');
  });
  it('entry admits pinned deployment fixtures before importing the persistent App store', () => {
    const entry = readFileSync('src/main.tsx','utf8');
    expect(entry).toContain('VITE_SHORE_DEPLOY_ORIGIN');
    expect(entry).not.toMatch(/import\s+\{\s*App\s*\}\s+from/);
  });
});
