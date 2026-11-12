/** About, privacy and terms (checklist points 1, 2, 4, 16, 17, 19, 20). */
import { useRef, useState } from 'react';
import { BUSINESS } from '../business';
import { RELEASED, VERSION, WHATS_NEW } from '../../version';
import { BACKUP_MAX_BYTES, backupJson, parseBackup, type Progress } from '../progress';
import { IssuerCredits } from './CareerLadder';
import { useQuality, type QualityPref } from '../three/quality';

export function AboutTab({ onResetPrefs, progress, onRestore }: { onResetPrefs: () => void; progress?: Progress; onRestore?: (p: Progress) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const download = () => {
    if (!progress) return;
    const blob = new Blob([backupJson(progress)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cf-sim-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Backup downloaded to your device.');
  };
  const restore = async (f: File | undefined) => {
    if (!f || !onRestore) return;
    const p = f.size > BACKUP_MAX_BYTES ? null : parseBackup(await f.text().catch(() => ''), f.size);
    if (p) {
      onRestore(p);
      setMsg('Progress restored from your backup.');
    } else {
      setMsg('That file is not a Critical Facilities Simulator backup. Nothing was changed.');
    }
    if (file.current) file.current.value = '';
  };
  return (
    <div className="tab-panel">
      <div className="page-head">
        <div className="eyebrow">About</div>
        <h1>About this simulator</h1>
      </div>
      <div className="grid grid-2">
        <section className="card" aria-labelledby="about-h">
          <h2 id="about-h">What it is</h2>
          <p>
            A free, offline teaching tool for how a modern data center keeps IT load powered and cooled, and what happens
            when equipment fails or is taken out for maintenance. Built for new technicians, students, and anyone curious.
          </p>
          <p>
            Every tag, layout and number is invented and generic. Concepts come from publicly documented industry practice
            and standards. Nothing here describes a real facility.
          </p>
          <div className="callout callout-warn">
            <strong>Not a site procedure. </strong>Educational simulation of generic data center infrastructure. Always
            follow your facility's approved MOPs/EOPs and LOTOTO program. Simplified physics: not an engineering or design
            tool. Tier-style descriptions explain ideas only; nothing here is certified.
          </div>
          <p className="muted small" data-version={VERSION}>
            Version {VERSION} · released {RELEASED}
          </p>
          <details className="acc">
            <summary>What's new in {VERSION}</summary>
            <ul>
              {WHATS_NEW.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </details>
          <h3>Built by</h3>
          <p>
            {BUSINESS.name}, {BUSINESS.city}
            <br />
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            <br />
            <a href={BUSINESS.site} rel="noopener">
              {BUSINESS.siteLabel}
            </a>
          </p>
        </section>

        <Display3D />

        <section className="card" aria-labelledby="privacy-h">
          <h2 id="privacy-h">Privacy</h2>
          <p>
            <strong>We collect nothing.</strong> No accounts, no forms, no analytics, no cookies, no ads, no tracking
            pixels, and no network requests after the page loads. The simulator runs entirely in your browser.
          </p>
          <p>
            Your preferences (light/dark theme, °F/°C, text size, 2D or 3D, 3D quality) and your learning progress (lessons finished, quiz answers,
            guides read, procedure and safety drill scores, daily challenge days, flashcard boxes, exam score, XP) are saved only in your own browser's local storage so they're remembered next
            time. They never leave your device. You can clear them here at any time:
          </p>
          <p>
            <strong>Offline copy:</strong> so the simulator works with no signal, your browser keeps a copy of this site's
            own files (pages, code, fonts, images) in its offline cache. It holds no information about you. Clearing this
            site's data in your browser settings removes it.
          </p>
          <div className="record-actions">
            <button className="btn" type="button" onClick={onResetPrefs}>
              Clear my saved settings & progress
            </button>
            {progress && (
              <button className="btn" type="button" onClick={download}>
                Download a backup
              </button>
            )}
            {onRestore && (
              <>
                <button className="btn" type="button" onClick={() => file.current?.click()}>
                  Restore from a backup
                </button>
                <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} aria-label="Choose a backup file" />
              </>
            )}
          </div>
          <p className="muted small" aria-live="polite">
            {msg || 'Backups are a file on your own device, for moving progress to a new phone or browser. The site never sees them.'}
          </p>
          <p>
            <strong>The Blueprint and your resume:</strong> if you add a resume, it is read inside your browser (PDF, Word or
            text) and then thrown away. It is never uploaded, sent or saved. Only the findings (job titles, keyword
            counts, certifications, rough years) and your answers are kept, in this browser's local storage, so your blueprint
            is there next time. Delete them any time with "Delete my blueprint" or the button below.
          </p>
          <p>
            <strong>Links to other sites:</strong> the Career tab links to certification issuers' own websites so you can
            find them easily. Those links open in a new tab, and those sites have their own privacy policies. This site
            doesn't track whether you click them.
          </p>
          <h3 style={{ marginTop: 16 }}>Feedback</h3>
          <p>
            The Feedback tab doesn't send anything itself. It opens a pre-filled email in your own email app (or a public
            GitHub issue, if you choose), which you review before sending. Emails are used only to improve this project
            and are deleted within 45 days of a request.
          </p>
          <p style={{ marginTop: 12 }}>
            The site is hosted on GitHub Pages; GitHub may keep standard server logs (such as IP addresses) under its own
            privacy statement. This site is not directed at children under 13.
          </p>
          <h2 id="terms-h" style={{ marginTop: 20 }}>
            Terms of use
          </h2>
          <ul>
            <li>For education only. No warranty of any kind; use at your own risk.</li>
            <li>Do not use it to plan or perform work on real equipment.</li>
            <li>The code is open source under the MIT License.</li>
            <li>Governed by the laws of the State of Texas.</li>
          </ul>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            These policies are a plain-language template and have not yet been reviewed by an attorney.
          </p>
          <h2 style={{ marginTop: 20 }}>Credits</h2>
          <p style={{ fontSize: '0.9rem' }}>
            Fonts: Inter and Montserrat, SIL Open Font License (license files ship in <code>/fonts</code>). All diagrams
            and icons are original artwork drawn in code. No photos are used.
          </p>
          <p style={{ fontSize: '0.9rem' }}>
            Trademarks: Kirk Key is a trademark of Kirk Key Interlock Company, a long-time maker of the trapped-key interlocks that
            the trade still calls a &ldquo;Kirk key&rdquo;. The name is used here, with respect and credit to them, only as that
            common trade term for teaching. The interlocks in this simulator are generic, not a model of their products, and
            Caylor Made Technologies has no affiliation with or endorsement from them. Other names of standards and
            organizations belong to their owners.
          </p>
        </section>
        <IssuerCredits />
      </div>
    </div>
  );
}

const QUALITY: { id: QualityPref; label: string; note: string }[] = [
  { id: 'auto', label: 'Auto', note: 'Picked for this device, and steps down by itself if 3D runs slow.' },
  { id: 'low', label: 'Low', note: 'Fastest. Sharp enough on most screens, no shadows, Home keeps its still artwork.' },
  { id: 'medium', label: 'Medium', note: 'Balanced for phones and older laptops.' },
  { id: 'high', label: 'High', note: 'Full resolution and soft shadows. Best on a laptop or desktop.' },
];

/** 3D quality: Auto, or pick a tier. Saved on this device only. */
function Display3D() {
  const { pref, tier, set } = useQuality();
  return (
    <section className="card" aria-labelledby="display-h">
      <h2 id="display-h">Display</h2>
      <fieldset className="q3d-set">
        <legend>3D quality</legend>
        <div className="q3d-opts">
          {QUALITY.map((q) => (
            <label key={q.id} className={`q3d-opt${pref === q.id ? ' on' : ''}`}>
              <input type="radio" name="q3d" value={q.id} checked={pref === q.id} onChange={() => set(q.id)} />
              <span className="q3d-label">{q.label}</span>
              <span className="q3d-note">{q.note}</span>
            </label>
          ))}
        </div>
        <p className="muted small" aria-live="polite">
          Using: <strong>{tier[0]!.toUpperCase() + tier.slice(1)}</strong>
          {pref === 'auto' ? ' (auto)' : ''}. Every 3D view also has a 2D version.
        </p>
      </fieldset>
    </section>
  );
}
