/** About, privacy and terms (checklist points 1, 2, 4, 16, 17, 19, 20). */
import { useRef, useState } from 'react';
import { BUSINESS } from '../business';
import { sanitize, type Progress } from '../progress';
import { IssuerCredits } from './CareerLadder';

export function AboutTab({ onResetPrefs, progress, onRestore }: { onResetPrefs: () => void; progress?: Progress; onRestore?: (p: Progress) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const download = () => {
    if (!progress) return;
    const blob = new Blob([JSON.stringify({ app: 'critical-facilities-sim', version: 1, saved: new Date().toISOString(), progress }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cf-sim-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Backup downloaded to your device.');
  };
  const restore = async (f: File | undefined) => {
    if (!f || !onRestore) return;
    try {
      if (f.size > 500_000) throw new Error('too big');
      const data = JSON.parse(await f.text()) as { app?: string; progress?: unknown };
      if (data.app !== 'critical-facilities-sim') throw new Error('not ours');
      onRestore(sanitize(data.progress));
      setMsg('Progress restored from your backup.');
    } catch {
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
            follow your facility's approved MOPs/EOPs and LOTO program. Simplified physics: not an engineering or design
            tool. Tier-style descriptions explain ideas only; nothing here is certified.
          </div>
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

        <section className="card" aria-labelledby="privacy-h">
          <h2 id="privacy-h">Privacy</h2>
          <p>
            <strong>We collect nothing.</strong> No accounts, no forms, no analytics, no cookies, no ads, no tracking
            pixels, and no network requests after the page loads. The simulator runs entirely in your browser.
          </p>
          <p>
            Your preferences (light/dark theme, °F/°C) and your learning progress (lessons finished, quiz answers,
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
            <strong>My Path and your resume:</strong> if you add a resume, it is read inside your browser (PDF, Word or
            text) and then thrown away. It is never uploaded, sent or saved. Only the findings (job titles, keyword
            counts, certifications, rough years) and your answers are kept, in this browser's local storage, so your path
            is there next time. Delete them any time with "Delete my path" or the button below.
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
        </section>
        <IssuerCredits />
      </div>
    </div>
  );
}
