/**
 * Error boundary around each tab (B-002): if a tab's code fails to load or it
 * crashes while drawing, only that tab shows this card. Header, nav and every
 * other tab keep working.
 */
import { Component, type ReactNode } from 'react';
import { Icon } from './icons';

/** True when the error is a lazy chunk that could not be fetched (offline, or removed by a new deploy). */
export function isChunkError(e: unknown): boolean {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(m);
}

interface Props {
  /** Name of the page, for the message. */
  label: string;
  children: ReactNode;
}
interface State {
  error: unknown;
}

export class TabBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkError(this.state.error);
    return (
      <section className="card tb-card" role="alert" aria-labelledby="tb-h">
        <Icon name="warning" />
        <h1 id="tb-h">{chunk ? `${this.props.label} didn't load` : `${this.props.label} hit a problem`}</h1>
        <p>
          {chunk
            ? "You may be offline, or a new version of the app just came out. Reloading usually fixes it. Your progress is safe: it's saved in this browser."
            : 'Something on this page went wrong. The rest of the app still works, and your progress is safe.'}
        </p>
        <div className="tb-actions">
          <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
            <Icon name="reset" /> Reload the app
          </button>
          {!chunk && (
            <button className="btn" type="button" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          )}
          <a className="btn" href="#/home">
            Go to Home
          </a>
        </div>
      </section>
    );
  }
}
