/**
 * Career ladder: start at the bottom rung and climb. Each rung shows what to
 * do in that phase, how to move up, certifications to go after, and the
 * side branches that open there. "I'm here" and ticked goals stay on this
 * device.
 */
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { BRANCHES, DC_CERTS, LADDER, branchesFrom, type Branch, type Cert } from '../../content/ladder';
import { Confetti } from '../common';
import { buzz } from '../haptics';
import { Icon } from '../icons';
import type { ProgressHandle } from '../progress';

function CertList({ certs }: { certs: Cert[] }) {
  return (
    <ul className="cert-list">
      {certs.map((c) => (
        <li key={c.name} className="cert">
          <span className="cert-medal" aria-hidden="true">
            🎖️
          </span>
          <span>
            <strong>{c.name}</strong>
            <span className="cert-by">{c.by}</span>
            <span className="cert-why">{c.why}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LadderView({ p, openBranch }: { p: ProgressHandle; openBranch: (id: string) => void }) {
  const start = LADDER.findIndex((r) => r.id === p.progress.careerRung);
  const [sel, setSel] = useState(start >= 0 ? start : 0);
  const [burst, setBurst] = useState(0);
  const detail = useRef<HTMLDivElement>(null);
  const r = LADDER[sel]!;
  const checks = new Set(p.progress.careerChecks);
  const doneHere = r.doNow.filter((_, i) => checks.has(`${r.id}:${i}`)).length;
  const here = p.progress.careerRung === r.id;
  const branches = branchesFrom(r.id);

  const go = (i: number, scroll = false) => {
    setSel(i);
    buzz(12);
    if (scroll && window.matchMedia?.('(max-width: 899px)').matches) detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const tick = (i: number) => {
    const key = `${r.id}:${i}`;
    const willFinish = !checks.has(key) && doneHere + 1 === r.doNow.length;
    p.toggleCareerCheck(key);
    if (willFinish) setBurst(Date.now());
  };

  return (
    <>
      <div className="callout">
        <strong>How it works: </strong>start at the bottom rung and climb. Tap any rung to see what to do in that phase,
        how to move up, and which certifications to go after. Mark the rung you're on with <strong>I'm here</strong>.
      </div>
      <div className="ladder-wrap">
        <nav className="career-ladder" aria-label="Career ladder, top rung first">
          <span className="ladder-end top" aria-hidden="true">
            🏁 Top
          </span>
          <ol className="ladder-rungs" reversed>
            {[...LADDER].reverse().map((rung) => {
              const i = LADDER.indexOf(rung);
              const done = rung.doNow.filter((_, k) => checks.has(`${rung.id}:${k}`)).length;
              const nBranch = branchesFrom(rung.id).length;
              return (
                <li key={rung.id}>
                  <button
                    type="button"
                    className={`rung${i === sel ? ' sel' : ''}${p.progress.careerRung === rung.id ? ' here' : ''}${done === rung.doNow.length ? ' complete' : ''}`}
                    aria-current={i === sel ? 'step' : undefined}
                    onClick={() => go(i, true)}
                  >
                    <span className="rung-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="rung-text">
                      <strong>{rung.role}</strong>
                      <span>
                        {rung.years}
                        {nBranch ? ` · ${nBranch} branch${nBranch > 1 ? 'es' : ''}` : ''}
                      </span>
                    </span>
                    <span className="rung-pips" aria-label={`${done} of ${rung.doNow.length} goals done`}>
                      {rung.doNow.map((_, k) => (
                        <span key={k} className={checks.has(`${rung.id}:${k}`) ? 'on' : ''} />
                      ))}
                    </span>
                    {p.progress.careerRung === rung.id && <span className="rung-you">You</span>}
                    {i === sel && (
                      <span className="rung-climber" aria-hidden="true">
                        🧗
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <span className="ladder-end bottom" aria-hidden="true">
            ⬆ Start here
          </span>
        </nav>

        <section className="card rung-detail" ref={detail} aria-labelledby="rung-h" key={r.id}>
          <div className="rung-top">
            <span className="eyebrow">
              Rung {sel + 1} of {LADDER.length} · {r.years}
            </span>
            <button className={`btn btn-sm${here ? ' btn-primary' : ''}`} type="button" aria-pressed={here} onClick={() => p.setCareerRung(here ? '' : r.id)}>
              <Icon name={here ? 'check' : 'target'} /> {here ? "I'm here" : "Mark I'm here"}
            </button>
          </div>
          <h2 id="rung-h">{r.role}</h2>
          <p className="muted small">Also called: {r.aka}</p>
          <p className="rung-summary">{r.summary}</p>

          <h3>
            <span aria-hidden="true">🎯</span> Do in this phase{' '}
            <span className="chip">
              {doneHere}/{r.doNow.length}
            </span>
          </h3>
          <ul className="goal-list">
            {r.doNow.map((g, i) => {
              const on = checks.has(`${r.id}:${i}`);
              return (
                <li key={g}>
                  <label className={`goal${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => tick(i)} />
                    <span>{g}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <h3>
            <span aria-hidden="true">⬆️</span> How to move up
          </h3>
          <ul className="advance-list">
            {r.advance.map((a) => (
              <li key={a}>
                <Icon name="arrow-up" /> {a}
              </li>
            ))}
          </ul>

          <h3>
            <span aria-hidden="true">🎖️</span> Certifications to go after
          </h3>
          <CertList certs={r.certs} />

          {branches.length > 0 && (
            <>
              <h3>
                <span aria-hidden="true">🔀</span> Branches that open here
              </h3>
              <div className="branch-chips">
                {branches.map((b) => (
                  <button key={b.id} type="button" className="chip-btn" onClick={() => openBranch(b.id)}>
                    <span aria-hidden="true">{b.emoji}</span> {b.title} <Icon name="arrow-right" />
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="rung-nav">
            <button className="btn" type="button" disabled={sel === 0} onClick={() => go(sel - 1)}>
              <Icon name="arrow-left" /> Step down
            </button>
            <button className="btn btn-primary" type="button" disabled={sel === LADDER.length - 1} onClick={() => go(sel + 1)}>
              Climb up <Icon name="arrow-up" />
            </button>
          </div>
          <Confetti burst={burst} />
        </section>
      </div>
      <p className="muted small">
        A typical path, not a promise: titles, years and requirements vary by employer, city and state. Certification
        names and rules change, so check the issuer's current requirements. Listing a certification is not an endorsement. See the Data center certs section for the fast-track roadmap.
      </p>
    </>
  );
}

function BranchCard({ b, open }: { b: Branch; open: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open]);
  const from = LADDER.findIndex((r) => r.id === b.from);
  return (
    <details className="card branch" ref={ref} open={open} id={b.id}>
      <summary>
        <span className="branch-emoji" aria-hidden="true">
          {b.emoji}
        </span>
        <span className="branch-head">
          <strong>{b.title}</strong>
          <span>
            Opens at rung {from + 1}: {LADDER[from]!.role}
          </span>
        </span>
        <Icon name="plus" />
      </summary>
      <p className="branch-what">{b.what}</p>
      <div className="branch-cols">
        <div>
          <h3>A typical day</h3>
          <ul>
            {b.day.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Skills to build</h3>
          <ul>
            {b.skills.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      <h3>Certifications</h3>
      <CertList certs={b.certs} />
      <h3>First steps you can take now</h3>
      <ol className="first-steps">
        {b.firstSteps.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
    </details>
  );
}

export function BranchesView({ openId }: { openId: string | null }) {
  return (
    <>
      <div className="callout">
        <strong>Branching off: </strong>you don't have to climb straight up. Once you have a few years on the floor, these
        side paths open up. Tap one to see the day-to-day, skills, certifications and first steps.
      </div>
      {LADDER.filter((r) => branchesFrom(r.id).length).map((r) => (
        <section key={r.id} className="branch-group" aria-labelledby={`bg-${r.id}`}>
          <h2 className="branch-group-h" id={`bg-${r.id}`}>
            <span className="rung-num" aria-hidden="true">
              {LADDER.indexOf(r) + 1}
            </span>
            From {r.role}
          </h2>
          <div className="branch-list">
            {branchesFrom(r.id).map((b) => (
              <BranchCard key={b.id} b={b} open={openId === b.id} />
            ))}
          </div>
        </section>
      ))}
      <p className="muted small">
        {BRANCHES.length} branches. A typical picture, not a promise. Check each issuer's current certification
        requirements.
      </p>
    </>
  );
}

export function CertRoadmap({ p, goLadder }: { p: ProgressHandle; goLadder: () => void }) {
  const [burst, setBurst] = useState(0);
  const got = new Set(p.progress.dcCerts);
  return (
    <>
      <div className="callout">
        <strong>Fast track: </strong>these data-center-specific certifications show you understand the whole plant, not
        just one machine, and they often show up in building engineer job posts. Most people take them in
        this order. <strong>Ask your employer first:</strong> many pay for them.
      </div>
      <p className="muted small">
        {got.size} of {DC_CERTS.length} marked as earned. Tap <strong>Got it</strong> when you pass one.
      </p>
      <ol className="cert-road">
        {DC_CERTS.map((c, i) => {
          const on = got.has(c.id);
          const rung = LADDER.findIndex((r) => r.id === c.rung);
          return (
            <li key={c.id} className={`card road-step${on ? ' on' : ''}`} style={{ '--i': i } as React.CSSProperties}>
              <span className="road-badge" aria-hidden="true">
                {on ? '✓' : c.short}
              </span>
              <div className="road-body">
                <div className="road-head">
                  <h2>
                    {c.name} <span className="road-short">({c.short})</span>
                  </h2>
                  <button
                    type="button"
                    className={`btn btn-sm${on ? ' btn-primary' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      if (!on) {
                        setBurst(Date.now());
                        buzz([10, 40, 10]);
                      }
                      p.toggleDcCert(c.id);
                    }}
                  >
                    <Icon name="check" /> {on ? 'Got it' : 'Mark got it'}
                  </button>
                </div>
                <p className="cert-by">{c.by}</p>
                <p>{c.why}</p>
                <dl className="road-facts">
                  <div>
                    <dt>Best at</dt>
                    <dd>
                      Rung {rung + 1}: {LADDER[rung]!.role}
                    </dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{c.format}</dd>
                  </div>
                  <div>
                    <dt>Before you start</dt>
                    <dd>{c.needs}</dd>
                  </div>
                </dl>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="callout">
        <strong>Pair them with the basics: </strong>OSHA 10/30, EPA 608, NFPA 70E training and an electrical license still
        matter. The{' '}
        <button className="linklike" type="button" onClick={goLadder}>
          career ladder
        </button>{' '}
        shows where each one fits.
      </div>
      <p className="muted small">
        Names, formats, prerequisites and renewal rules come from the issuers and change over time (several renew every 3
        years). Check the issuer's current details before you sign up. Listing a certification is not an endorsement, and
        this site has no ties to any issuer.
      </p>
      <Confetti burst={burst} />
    </>
  );
}
