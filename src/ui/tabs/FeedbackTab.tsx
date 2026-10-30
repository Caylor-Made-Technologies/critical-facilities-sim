/**
 * Feedback tab. The site never sends or stores anything: the form builds a
 * message and opens it in the person's own email app (or a GitHub issue),
 * where they can review it before sending. Consent boxes start unchecked
 * (checklist points 6, 7, 9).
 */
import { useMemo, useState } from 'react';
import { BUSINESS } from '../business';
import { PageHead } from '../common';
import { Icon } from '../icons';

const TYPES = ['Idea / feature request', 'Something is wrong or confusing', 'Technical content correction', 'Bug', 'Kudos'];
const AREAS = ['Simulator', 'Learn', 'Quiz', 'Equipment', 'Never Do', 'Glossary', 'Safety', 'Codes & Standards', 'Uptime', 'Change Mgmt', 'Other'];
const MAX = 2000;

export function FeedbackTab() {
  const [type, setType] = useState(TYPES[0]!);
  const [area, setArea] = useState(AREAS[0]!);
  const [rating, setRating] = useState(0);
  const [msg, setMsg] = useState('');
  const [adult, setAdult] = useState(false);
  const [reply, setReply] = useState(false);
  const [tried, setTried] = useState(false);

  const ready = msg.trim().length >= 5 && adult;

  const body = useMemo(
    () =>
      [
        `Type: ${type}`,
        `Area: ${area}`,
        rating ? `Rating: ${rating}/5` : 'Rating: (none)',
        `OK to reply: ${reply ? 'yes' : 'no'}`,
        `Consent (18+, read privacy policy) given: ${new Date().toISOString()}`,
        '',
        msg.trim(),
      ].join('\n'),
    [type, area, rating, reply, msg],
  );
  const subject = `Critical Facilities Simulator feedback: ${type}`;
  const mailto = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const issue = `${BUSINESS.github}/issues/new?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Feedback" title="Help make this better">
        Spotted something wrong, have an idea, or want a topic covered? I'm building this to learn and grow, and your
        feedback shapes what comes next.
      </PageHead>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form
          className="card feedback-form"
          aria-labelledby="fb-h"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
          }}
          noValidate
        >
          <h2 id="fb-h" className="h-card">
            Your feedback
          </h2>
          <label className="field">
            What kind of feedback?
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Which part of the app?
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {AREAS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <fieldset className="field stars">
            <legend>How useful is it so far? (optional)</legend>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`star${n <= rating ? ' on' : ''}`}>
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="visually-hidden" />
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8z" />
                  </svg>
                  <span className="visually-hidden">{n} of 5</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field">
            Your message
            <textarea value={msg} maxLength={MAX} rows={6} onChange={(e) => setMsg(e.target.value)} placeholder="What should be added, fixed, or explained better?" aria-describedby="fb-count" />
            <span id="fb-count" className="hint">
              {msg.length}/{MAX}. Please don't include passwords, site names, or anything confidential.
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span>
              I'm 18 or older and I've read the{' '}
              <a href="#/about">privacy policy</a>. (Required)
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={reply} onChange={(e) => setReply(e.target.checked)} />
            <span>It's OK to reply to me at the address I send from. (Optional)</span>
          </label>
          {tried && !ready && (
            <p className="form-error" role="alert">
              Please write a short message and tick the required box.
            </p>
          )}
          <div className="card-actions">
            {ready ? (
              <>
                <a className="btn btn-primary" href={mailto}>
                  <Icon name="arrow-right" /> Open in my email app
                </a>
                <a className="btn" href={issue} target="_blank" rel="noopener noreferrer">
                  Post as a GitHub issue
                </a>
              </>
            ) : (
              <button className="btn btn-primary" type="submit">
                <Icon name="arrow-right" /> Continue
              </button>
            )}
          </div>
        </form>

        <aside className="card" aria-labelledby="fb-how">
          <h2 id="fb-how" className="h-card">
            How this works
          </h2>
          <ul>
            <li>This site never sends or stores your feedback. Nothing leaves your device until you choose to send it.</li>
            <li>"Open in my email app" opens a pre-filled email you can review and edit before sending.</li>
            <li>"Post as a GitHub issue" opens a public issue on the project (needs a GitHub account). Anyone can read it.</li>
            <li>Emails are only used to improve this project. Ask any time and they'll be deleted within 45 days.</li>
          </ul>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Prefer to write directly? <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
          </p>
        </aside>
      </div>
    </div>
  );
}
