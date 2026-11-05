import { test as base, expect, type Page } from '@playwright/test';

/** Chromium's software GL prints driver notes as console warnings; they are not app messages. */
const IGNORE = [/GL Driver Message/, /GPU stall due to ReadPixels/, /Automatic fallback to software WebGL/];

export interface Cf3d {
  plant?: {
    project: (id: string) => { x: number; y: number } | null;
    nodeState: (id: string) => { state: string; light: string } | null;
    liveLinks: () => number;
    frames: () => number;
    focus: (id: string | null) => void;
    info: () => { geometries: number; textures: number; programs: number; calls: number; triangles: number; target: [number, number, number]; flying: boolean };
  };
}
declare global {
  interface Window {
    __cf3d?: Cf3d;
    __glLive?: () => number;
  }
}

export const test = base.extend<{ problems: string[]; open: (hash: string, opts?: { three?: boolean; quality?: 'auto' | 'low' | 'medium' | 'high' }) => Promise<void> }>({
  problems: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if ((m.type() === 'error' || m.type() === 'warning') && !IGNORE.some((r) => r.test(m.text()))) problems.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    await use(problems);
    expect(problems, 'no console errors or warnings').toEqual([]);
  },
  open: async ({ page, problems }, use) => {
    void problems;
    await use(async (hash, opts = {}) => {
      const three = opts.three ?? true;
      // This machine draws WebGL in software, which Auto maps to Low; tests pin a tier unless they test Auto.
      const quality = opts.quality ?? 'medium';
      await page.addInitScript(([on, q]) => {
        sessionStorage.setItem('cfs-splash', '1');
        localStorage.setItem('cfs-sim-3d', on ? '1' : '0');
        localStorage.setItem('cfs-3d-quality', q as string);
        // Count WebGL contexts that are still alive (for leak checks).
        const made: (WebGLRenderingContext | WebGL2RenderingContext)[] = [];
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (orig as any).call(this, type, ...rest);
          if (ctx && (type === 'webgl' || type === 'webgl2') && !made.includes(ctx)) made.push(ctx);
          return ctx;
        } as typeof orig;
        window.__glLive = () => made.filter((c) => !c.isContextLost()).length;
      }, [three, quality] as const);
      await page.goto(`./?debug3d${hash}`);
    });
  },
});
export { expect };

/** Scroll a device on the 3D plant to the middle of the screen and tap it (like a person would). */
export async function tapDevice(page: Page, id: string) {
  await page.locator('.scene3d-plant canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__cf3d?.plant?.info().flying === false);
  for (let i = 0; i < 3; i++) {
    const r = await page.evaluate((i) => {
      const pt = window.__cf3d!.plant!.project(i);
      if (!pt) return null;
      const el = document.elementFromPoint(pt.x, pt.y);
      return { pt, onCanvas: !!el?.closest('.scene3d-plant'), mid: innerHeight / 2 };
    }, id);
    if (!r) throw new Error(`${id} not in the 3D plant`);
    if (r.onCanvas) {
      await page.mouse.click(r.pt.x, r.pt.y);
      return;
    }
    await page.evaluate((dy) => window.scrollBy(0, dy), r.pt.y - r.mid);
    await page.waitForTimeout(100);
  }
  throw new Error(`${id} is covered on screen`);
}

/** Wait for the 3D plant, scrolled into view (it only draws while on screen). */
export async function plantReady(page: Page) {
  await page.waitForFunction(() => !!window.__cf3d?.plant);
  await page.locator('.scene3d-plant canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__cf3d!.plant!.frames() > 0);
}
