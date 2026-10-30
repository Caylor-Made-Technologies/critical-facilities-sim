/** Tiny content model so articles can be written as data and rendered consistently. */
export type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { callout: string; title?: string; tone?: 'info' | 'warn' | 'danger' }
  | { table: { head: string[]; rows: string[][] } };

export interface Article {
  id: string;
  group: string;
  title: string;
  intro: string;
  blocks: Block[];
}
