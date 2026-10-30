/**
 * interlocks.ts — Kirk-key (trapped-key) interlock system.
 *
 * Physical model:
 *   - Each lock is mounted on one breaker and accepts one key code.
 *   - A key is TRAPPED in its lock while that breaker is closed.
 *   - A key can be removed only when the breaker is open; removing it
 *     locks the breaker open.
 *   - A breaker can be closed only if a matching key is in its lock.
 *   - Some locks are fed by a solenoid key release unit (SKRU). It holds
 *     the key until an electrical permissive is true, e.g. "UPS is on
 *     static bypass" before the UPS output breaker key can be released.
 *
 * With N locks and fewer keys than locks, at most (number of keys) of
 * those breakers can ever be closed at once. That is how a main-tie-main
 * scheme gets its "only two of three closed" rule.
 */

import type { PlantGraph } from './graph';
import type { ActionResult } from './types';

/** An electrical permissive checked before an SKRU releases its key. */
export type Permissive = (g: PlantGraph) => { ok: boolean; why: string };

export interface Lock {
  id: string;
  /**
   * The breaker this lock is mounted on, or null for a key release unit
   * (SKRU) mounted on equipment, which only releases its key on a permissive.
   */
  breakerId: string | null;
  /** Key code this lock accepts (several locks can share one code). */
  code: string;
  /** Optional SKRU permissive; the key can't be removed until it is satisfied. */
  permissive?: { label: string; check: Permissive };
}

export interface Key {
  id: string;
  code: string;
  /** Lock currently holding the key, or null when the operator is carrying it. */
  inLock: string | null;
}

export interface InterlockScheme {
  id: string;
  title: string;
  /** Why the scheme exists, in plain English. */
  purpose: string;
  locks: Lock[];
  keys: Key[];
}

export class InterlockSystem {
  readonly schemes: InterlockScheme[] = [];

  addScheme(s: InterlockScheme): void {
    this.schemes.push(s);
  }

  private allLocks(): Lock[] {
    return this.schemes.flatMap((s) => s.locks);
  }

  private allKeys(): Key[] {
    return this.schemes.flatMap((s) => s.keys);
  }

  lock(lockId: string): Lock {
    const l = this.allLocks().find((x) => x.id === lockId);
    if (!l) throw new Error(`Unknown lock ${lockId}`);
    return l;
  }

  key(keyId: string): Key {
    const k = this.allKeys().find((x) => x.id === keyId);
    if (!k) throw new Error(`Unknown key ${keyId}`);
    return k;
  }

  locksOn(breakerId: string): Lock[] {
    return this.allLocks().filter((l) => l.breakerId === breakerId);
  }

  keyIn(lockId: string): Key | undefined {
    return this.allKeys().find((k) => k.inLock === lockId);
  }

  /** Keys the operator is currently holding. */
  carried(): Key[] {
    return this.allKeys().filter((k) => k.inLock === null);
  }

  /**
   * Can this breaker be closed as far as the interlocks are concerned?
   * Every lock on the breaker must hold its key.
   */
  canClose(breakerId: string): ActionResult {
    for (const l of this.locksOn(breakerId)) {
      if (!this.keyIn(l.id)) {
        return {
          ok: false,
          reason: `Lock ${l.id} on ${breakerId} is empty. Key "${l.code}" is held elsewhere, so this breaker is locked open. Free the key by opening the breaker that holds it.`,
        };
      }
    }
    return { ok: true };
  }

  /** Remove a key from its lock. Only allowed when the breaker is open and any SKRU permissive is met. */
  removeKey(g: PlantGraph, lockId: string): ActionResult {
    const l = this.lock(lockId);
    const k = this.keyIn(lockId);
    if (!k) return { ok: false, reason: `There is no key in lock ${lockId}.` };
    const breaker = l.breakerId ? g.get(l.breakerId) : null;
    if (breaker?.state.closed) {
      return {
        ok: false,
        reason: `Key "${k.code}" is trapped: ${breaker.tag} is closed. A key can only be removed from an open breaker. That keeps one key from closing two breakers at once.`,
      };
    }
    if (l.permissive) {
      const p = l.permissive.check(g);
      if (!p.ok) {
        return { ok: false, reason: `The key release unit holds the key: ${l.permissive.label} is not met. ${p.why}` };
      }
    }
    k.inLock = null;
    const after = breaker ? `${breaker.tag} is now locked open.` : 'The key is free to use.';
    return { ok: true, message: `Removed key "${k.code}" from ${lockId}. ${after}` };
  }

  /** Insert a carried key into a lock with a matching code. */
  insertKey(keyId: string, lockId: string): ActionResult {
    const k = this.key(keyId);
    const l = this.lock(lockId);
    if (k.inLock !== null) return { ok: false, reason: `Key ${keyId} is still in lock ${k.inLock}. Remove it first.` };
    if (k.code !== l.code) return { ok: false, reason: `Key "${k.code}" does not fit lock ${lockId} (needs "${l.code}").` };
    if (this.keyIn(lockId)) return { ok: false, reason: `Lock ${lockId} already holds a key.` };
    k.inLock = lockId;
    return { ok: true, message: `Inserted key "${k.code}" into ${lockId}.` };
  }

  clone(): InterlockSystem {
    const c = new InterlockSystem();
    for (const s of this.schemes) {
      c.addScheme({ ...s, locks: s.locks.map((l) => ({ ...l })), keys: s.keys.map((k) => ({ ...k })) });
    }
    return c;
  }
}
