/**
 * Career: the career ladder (bottom rung up) with branches, interview
 * practice (flashcards + full list), and a shift handoff report built from
 * the live simulator.
 */
import { useState } from 'react';
import { INTERVIEW, INTERVIEW_CATS, type InterviewCat } from '../../content/career';
import { BATTERY_AGES, TOPOLOGIES, WEATHER, type Simulation } from '../../sim';
import { PageHead, SectionTabs } from '../common';
import { Flashcards } from '../Flashcards';
import { Icon } from '../icons';
import type { Units } from '../prefs';
import { plantIssues } from '../sim/StatusBanner';
import type { ProgressHandle } from '../progress';
import { BranchesView, CertRoadmap, LadderView } from './CareerLadder';

type Section = 'ladder' | 'certs' | 'branches' | 'interview' | 'handoff';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'ladder', label: 'Career ladder' },
  { id: 'certs', label: 'Data center certs' },
  { id: 'branches', label: 'Branch out' },
  { id: 'interview', label: 'Interview prep' },
  { id: 'handoff', label: 'Shift handoff' },
];

interface Props {
  sim: Simulation;
  version: number;
  units: Units;
  boxes: Record<string, number>;
  onRate: (id: string, knew: boolean) => void;
  openSim: () => void;
  p: ProgressHandle;
}

export function CareerTab({ sim, units, boxes, onRate, openSim, p }: Props) {
  const [sec, setSec] = useState<Section>('ladder');
  const [branch, setBranch] = useState<string | null>(null);
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Career" title="Get the job, grow in it">
        Climb the ladder from technician to director, see what to do and which certifications to get at each step,
        branch off into specialist roles, practice interview questions, and write a shift handoff from the live plant.
      </PageHead>
      <SectionTabs label="Career sections" sections={SECTIONS} value={sec} onChange={setSec} />
      <div className="safety-pane" key={sec}>
        {sec === 'interview' && <Interview boxes={boxes} onRate={onRate} />}
        {sec === 'ladder' && (
          <LadderView
            p={p}
            openBranch={(id) => {
              setBranch(id);
              setSec('branches');
            }}
          />
        )}
        {sec === 'certs' && <CertRoadmap p={p} goLadder={() => setSec('ladder')} />}
        {sec === 'branches' && <BranchesView openId={branch} />}
        {sec === 'handoff' && <Handoff sim={sim} units={units} openSim={openSim} />}
      </div>
    </div>
  );
}

function Interview({ boxes, onRate }: { boxes: Record<string, number>; onRate: (id: string, knew: boolean) => void }) {
  const [cat, setCat] = useState<InterviewCat | 'all'>('all');
  const [mode, setMode] = useState<'cards' | 'list'>('cards');
  const qs = INTERVIEW.filter((q) => cat === 'all' || q.cat === cat);
  return (
    <>
      <div className="pick-row" role="group" aria-label="Question topic">
        {(['all', ...INTERVIEW_CATS] as const).map((c) => (
          <button key={c} type="button" className={`chip-btn${cat === c ? ' on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? 'All topics' : c}
          </button>
        ))}
      </div>
      <div className="mode-switch" role="group" aria-label="Interview view">
        <button type="button" aria-pressed={mode === 'cards'} onClick={() => setMode('cards')}>
          Practice cards
        </button>
        <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
          All answers
        </button>
      </div>
      <div className="callout">
        <strong>How to practice: </strong>say your answer out loud first, then flip the card and check it against the
        points a strong answer hits.
      </div>
      {mode === 'cards' ? (
        <Flashcards
          key={cat}
          label="Interview practice cards"
          boxes={boxes}
          onRate={onRate}
          cards={qs.map((q) => ({
            id: `iv:${q.id}`,
            tag: q.cat,
            front: q.q,
            back: (
              <span className="iv-back">
                <span className="iv-points">
                  {q.points.map((pt) => (
                    <span key={pt}>
                      <Icon name="check" /> {pt}
                    </span>
                  ))}
                </span>
                <em>Tip: {q.tip}</em>
              </span>
            ),
          }))}
        />
      ) : (
        <div className="iv-list">
          {qs.map((q) => (
            <details key={q.id} className="card iv-item">
              <summary>
                <span className="chip">{q.cat}</span> {q.q}
              </summary>
              <ul>
                {q.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              <p className="muted">
                <strong>Tip:</strong> {q.tip}
              </p>
            </details>
          ))}
        </div>
      )}
    </>
  );
}

function Handoff({ sim, units, openSim }: { sim: Simulation; units: Units; openSim: () => void }) {
  const [work, setWork] = useState('');
  const [upcoming, setUpcoming] = useState('');
  const [notes, setNotes] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const issues = plantIssues(sim, units);
  const nodes = [...sim.graph.nodes.values()];
  const notNormal = nodes.filter((n) => n.kind !== 'breaker' && n.kind !== 'rack' && (n.status === 'failed' || n.status === 'maintenance' || n.status === 'offline'));
  const gens = sim.graph.byKind('generator').filter((g) => g.state.genState && g.state.genState !== 'off');
  const alarms = sim.events.filter((e) => e.severity === 'alarm' || e.severity === 'critical').slice(-8).reverse();
  const stamp = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const field = (label: string, v: string, set: (s: string) => void, hint: string, rows = 2) => (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={v} placeholder={hint} maxLength={600} onChange={(e) => set(e.target.value)} />
    </label>
  );
  const text = (label: string, v: string, set: (s: string) => void) => (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={v} maxLength={60} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <div className="grid brief-wrap">
      <form className="card brief-form no-print" onSubmit={(e) => e.preventDefault()} aria-label="Shift handoff">
        <h2 className="h-card">Write the handoff</h2>
        <p className="muted">
          The plant status fills itself in from the simulator right now. Break something in the{' '}
          <button className="linklike" type="button" onClick={openSim}>
            Simulator
          </button>{' '}
          and come back to see it change. Nothing is saved or sent.
        </p>
        <div className="handoff-names">
          {text('Outgoing tech', from, setFrom)}
          {text('Incoming tech', to, setTo)}
        </div>
        {field('Work in progress', work, setWork, 'e.g. CRAH-104 belt replaced, fan locked out until the PM sign-off', 3)}
        {field('Coming up', upcoming, setUpcoming, 'e.g. Generator test 0900, vendor on site for UPS PM at 1300')}
        {field('Watch items & notes', notes, setNotes, 'e.g. CH-02 approach trending up, keep an eye on it', 3)}
      </form>
      <section className="card handoff print-area" aria-labelledby="handoff-h">
        <div className="brief-top">
          <h2 className="h-card" id="handoff-h">
            Shift handoff
          </h2>
          <span className={`score-pill${issues.length ? '' : ' final'}`}>{issues.length ? `${issues.length} open` : 'Normal'}</span>
        </div>
        <p className="muted small">
          {stamp} · {TOPOLOGIES[sim.meta.topology].label} · {WEATHER[sim.thermal.state.weather].label} · PUE {sim.pue().toFixed(2)} · UPS batteries {BATTERY_AGES[sim.batteryAge].label}
        </p>
        <dl className="brief-dl">
          <dt>From → to</dt>
          <dd>
            {from || '—'} → {to || '—'}
          </dd>
          <dt>Plant status</dt>
          <dd>{issues.length ? issues.map((i) => i.text).join(' · ') : 'All systems normal.'}</dd>
          <dt>Out of normal</dt>
          <dd>{notNormal.length ? notNormal.map((n) => `${n.tag} (${n.status === 'maintenance' ? 'out of service' : n.status})`).join(', ') : 'None.'}</dd>
          <dt>Generators</dt>
          <dd>{gens.length ? gens.map((g) => `${g.tag} ${g.state.genState}${g.state.manualRun ? ' (test run)' : ''}`).join(', ') : 'All off, in AUTO.'}</dd>
          <dt>Recent alarms</dt>
          <dd>
            {alarms.length ? (
              <ul className="handoff-alarms">
                {alarms.map((e, i) => (
                  <li key={`${e.t}-${i}`}>
                    <strong>{e.source}</strong> {e.message}
                  </li>
                ))}
              </ul>
            ) : (
              'None.'
            )}
          </dd>
          <dt>Work in progress</dt>
          <dd>{work || '—'}</dd>
          <dt>Coming up</dt>
          <dd>{upcoming || '—'}</dd>
          <dt>Watch items</dt>
          <dd>{notes || '—'}</dd>
        </dl>
        <div className="brief-sign print-only">
          <span>Outgoing initials: __________ Incoming initials: __________</span>
        </div>
        <div className="record-actions no-print">
          <button className="btn btn-sm" type="button" onClick={() => window.print()}>
            <Icon name="print" /> Print
          </button>
        </div>
        <p className="muted small">Practice report from a simulated plant. Talk it through face to face, too.</p>
      </section>
    </div>
  );
}
