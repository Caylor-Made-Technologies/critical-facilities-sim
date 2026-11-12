/** Phase 10: version in the app, package.json and the changelog stay in step. */
import { describe, expect, it } from 'vitest';
import { RELEASED, VERSION } from '../../version';
import pkg from '../../../package.json';

const CHANGELOG = Object.values(import.meta.glob('../../../CHANGELOG.md', { query: '?raw', import: 'default', eager: true }))[0] as string;

describe('version', () => {
  it('package.json, version.ts and the top of CHANGELOG.md agree', () => {
    expect(pkg.version).toBe(VERSION);
    expect(CHANGELOG).toMatch(new RegExp(`^## ${VERSION.replace(/\./g, '\\.')} — ${RELEASED}$`, 'm'));
    expect(CHANGELOG.indexOf(`## ${VERSION}`)).toBe(CHANGELOG.indexOf('## '));
  });
});
