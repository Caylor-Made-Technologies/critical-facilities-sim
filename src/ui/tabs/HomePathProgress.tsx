/** Home path card with a saved blueprint: progress ring and next step (lazy: needs the path builder). */
import { buildPath, itemDone, scoreProfile } from '../../content/path';
import { Icon } from '../icons';
import type { Tab } from '../nav';
import type { ProgressHandle } from '../progress';

export default function PathProgress({ p, go }: { p: ProgressHandle; go: (t: Tab) => void }) {
  const prof = p.progress.profile!;
  const s = scoreProfile(prof);
  const path = buildPath(prof, s);
  const all = path.phases.flatMap((ph) => ph.items);
  const done = all.filter((it) => itemDone(it, p.progress, prof.done)).length;
  const next = all.find((it) => !itemDone(it, p.progress, prof.done));
  return (
    <button type="button" className="path-invite has-path" onClick={() => go('mypath')}>
      <span className="path-invite-ring" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" className="ring-bg" />
          <circle cx="20" cy="20" r="16" className="ring-fg" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - (all.length ? done / all.length : 0))} />
        </svg>
        <span>{all.length ? Math.round((done / all.length) * 100) : 0}%</span>
      </span>
      <span>
        <strong>{prof.name ? `${prof.name}'s blueprint` : 'Your blueprint'} · rev {prof.rev} · {done}/{all.length} done</strong>
        <span>{next ? `Next up: ${next.title}` : 'Fully energized. Draw your next revision!'}</span>
      </span>
      <Icon name="arrow-right" />
    </button>
  );
}
