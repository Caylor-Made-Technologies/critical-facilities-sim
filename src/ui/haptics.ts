/** A tiny buzz on phones that support it. Off for reduced motion; silently ignored elsewhere. */
export function buzz(pattern: number | number[]): void {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
