import { BRANCHES, LADDER, branchesFrom } from '../../content/ladder';
import { BADGES } from '../../ui/badges';
import { sanitize } from '../../ui/progress';

describe('career ladder', () => {
  it('climbs from technician to director with goals, ways up and certifications on every rung', () => {
    expect(LADDER.length).toBeGreaterThanOrEqual(6);
    expect(LADDER[0]!.role).toMatch(/technician/i);
    expect(LADDER.some((r) => /building engineer/i.test(r.role))).toBe(true);
    expect(new Set(LADDER.map((r) => r.id)).size).toBe(LADDER.length);
    for (const r of LADDER) {
      expect(r.doNow.length, r.id).toBeGreaterThanOrEqual(3);
      expect(r.advance.length, r.id).toBeGreaterThanOrEqual(1);
      expect(r.certs.length, r.id).toBeGreaterThanOrEqual(1);
      for (const c of r.certs) expect(c.by.length, c.name).toBeGreaterThan(3);
    }
  });
  it('branches include electrical SME, controls and technical writer, and all start on a real rung', () => {
    const titles = BRANCHES.map((b) => b.title).join(' | ');
    for (const re of [/Electrical subject matter expert/, /Controls/, /Technical writer/, /software/i]) expect(titles).toMatch(re);
    for (const b of BRANCHES) {
      expect(LADDER.some((r) => r.id === b.from), b.id).toBe(true);
      expect(b.certs.length && b.firstSteps.length && b.day.length && b.skills.length, b.id).toBeTruthy();
    }
    expect(LADDER.reduce((n, r) => n + branchesFrom(r.id).length, 0)).toBe(BRANCHES.length);
  });
  it('saved rung and goals are validated, and the climber badge works', () => {
    const p = sanitize({ careerRung: 'r3', careerChecks: ['r1:0', 'bad', 'r1:1'] });
    expect(p.careerRung).toBe('r3');
    expect(p.careerChecks).toEqual(['r1:0', 'r1:1']);
    expect(sanitize({ careerRung: '<script>' }).careerRung).toBe('');
    const climber = BADGES.find((b) => b.id === 'climber')!;
    expect(climber.earned(p)).toBe(false);
    expect(climber.earned(sanitize({ careerChecks: LADDER[0]!.doNow.map((_, i) => `r1:${i}`) }))).toBe(true);
  });
});

describe('data center cert roadmap', () => {
  it('lists the main data center certs with issuer, best rung, format and prerequisites', async () => {
    const { DC_CERTS } = await import('../../content/ladder');
    const shorts = DC_CERTS.map((c) => c.short);
    for (const s of ['CDCP', 'CDCTP', 'CDFOM', 'AOS', 'CDCMP']) expect(shorts).toContain(s);
    expect(new Set(DC_CERTS.map((c) => c.id)).size).toBe(DC_CERTS.length);
    for (const c of DC_CERTS) {
      expect(LADDER.some((r) => r.id === c.rung), c.id).toBe(true);
      expect(c.by && c.format && c.needs && c.why, c.id).toBeTruthy();
      expect(c.id).toMatch(/^[a-z]{2,8}$/);
    }
    // The building engineer rung names data-center-specific certs too.
    expect(LADDER.find((r) => r.id === 'r3')!.certs.map((c) => c.name).join(' ')).toMatch(/CDFOM/);
  });
  it('earned certs are validated and unlock the Certified badge', () => {
    expect(sanitize({ dcCerts: ['cdcp', 'BAD!', 7] }).dcCerts).toEqual(['cdcp']);
    expect(BADGES.find((b) => b.id === 'dc-certified')!.earned(sanitize({ dcCerts: ['cdcp'] }))).toBe(true);
  });
});

describe('issuer credits and rung details', () => {
  it('every certification names an issuer that is linked, unless it is a state, employer, school or generic provider', async () => {
    const { DC_CERTS, RUNG_DETAILS } = await import('../../content/ladder');
    const { ISSUERS, issuersFor } = await import('../../content/issuers');
    const generic = /state|employer|college|university|provider|training body|equipment maker|cloud provider|course provider/i;
    const all = [...LADDER.flatMap((r) => r.certs), ...BRANCHES.flatMap((b) => b.certs), ...DC_CERTS.map((c) => ({ name: c.name, by: c.by }))];
    for (const c of all) {
      if (issuersFor(c.by).length === 0) expect(c.by, `${c.name} needs an issuer link`).toMatch(generic);
    }
    for (const i of ISSUERS) {
      expect(i.url, i.id).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[\w\-/]*)?$/);
      expect(i.url, i.id).not.toMatch(/epi\.org/); // a different organization
    }
    // Each data center cert links to its issuer.
    for (const c of DC_CERTS) expect(issuersFor(c.by).length, c.id).toBeGreaterThan(0);
    expect(issuersFor('EPI (exam by EXIN)').map((i) => i.id)).toEqual(['epi', 'exin']);
    // Rung details
    const { INTERVIEW } = await import('../../content/career');
    const { NAV } = await import('../../ui/nav');
    for (const r of LADDER) {
      const d = RUNG_DETAILS[r.id]!;
      expect(d, r.id).toBeDefined();
      for (const v of Object.values(d.mix)) expect(v >= 0 && v <= 100, r.id).toBe(true);
      expect(d.day.length && d.tools.length && d.kpis.length && d.mistakes.length && d.practice.length, r.id).toBeTruthy();
      for (const id of d.interview) expect(INTERVIEW.some((q) => q.id === id), `${r.id} ${id}`).toBe(true);
      for (const x of d.practice) expect(NAV.some((n) => n.id === x.tab), `${r.id} ${x.tab}`).toBe(true);
    }
  });
});
