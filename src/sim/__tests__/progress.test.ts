import v1 from './fixtures/progress-v1.json';
import { BACKUP_MAX_BYTES, backupJson, migrate, parseBackup, SCHEMA } from '../../ui/progress';

// B-004: saved progress carries a schema version; every older save still loads.
describe('saved progress migration', () => {
  it('a v1 save (no version field, saved before 2026-11-06) loads with nothing lost', () => {
    const p = migrate(v1);
    expect(p.procs).toEqual({ 'mop-gen-test': 100, 'drill-utility': 85, 'life-ist': 100 });
    expect(p.life['life-site']).toEqual({ quiz: 100, task: true, tour: true });
    expect(p.lessons).toEqual(v1.lessons);
    expect(p.daily).toEqual(v1.daily);
    expect(p.exam).toBe(88);
    expect(p.careerRung).toBe('r2');
    expect(p.dcCerts).toEqual(['cdcp']);
  });
  it('what this version saves loads back identical', () => {
    const p = migrate(v1);
    const stored = JSON.parse(JSON.stringify({ ...p, schema: SCHEMA }));
    expect(stored.schema).toBe(SCHEMA);
    expect(migrate(stored)).toEqual(p);
  });
  it('a save from a newer version keeps the fields this version understands', () => {
    const p = migrate({ ...v1, schema: SCHEMA + 5, someNewThing: { x: 1 } });
    expect(p.procs['mop-gen-test']).toBe(100);
    expect(p).not.toHaveProperty('someNewThing');
  });
  it('junk never throws and never produces NaN', () => {
    for (const junk of [null, undefined, 42, 'text', [], { schema: 'two' }, { procs: { a: NaN, b: 150, c: 90 } }]) {
      const p = migrate(junk);
      expect(p.exam).toBe(-1);
      expect(Object.values(p.procs).every((n) => Number.isFinite(n))).toBe(true);
    }
    expect(migrate({ procs: { a: NaN, b: 150, c: 90 } }).procs).toEqual({ c: 90 });
  });
});

describe('backup files', () => {
  const good = backupJson(migrate(v1), new Date('2026-11-06T12:00:00Z'));

  it('a fresh backup restores exactly', () => {
    expect(parseBackup(good)).toEqual(migrate(v1));
  });
  it('an old backup (version 1 file, no schema) still restores', () => {
    const old = JSON.stringify({ app: 'critical-facilities-sim', version: 1, saved: '2026-11-01T00:00:00Z', progress: v1 });
    expect(parseBackup(old)?.procs['mop-gen-test']).toBe(100);
  });
  it('bad files change nothing (null): not JSON, another app, empty, no progress', () => {
    expect(parseBackup('not json {')).toBeNull();
    expect(parseBackup('')).toBeNull();
    expect(parseBackup('null')).toBeNull();
    expect(parseBackup(JSON.stringify({ app: 'other-app', progress: v1 }))).toBeNull();
    // Our app name but no progress must not wipe someone's progress with an empty one.
    expect(parseBackup(JSON.stringify({ app: 'critical-facilities-sim' }))).toBeNull();
    expect(parseBackup(JSON.stringify({ app: 'critical-facilities-sim', progress: [] }))).toBeNull();
  });
  it('a huge file is refused before it is read', () => {
    expect(parseBackup(good, BACKUP_MAX_BYTES + 1)).toBeNull();
    const big = JSON.stringify({ app: 'critical-facilities-sim', progress: { ...v1, lessons: Array.from({ length: 60_000 }, (_, i) => `l${i}`) } });
    expect(big.length).toBeGreaterThan(BACKUP_MAX_BYTES);
    expect(parseBackup(big)).toBeNull();
  });
});
