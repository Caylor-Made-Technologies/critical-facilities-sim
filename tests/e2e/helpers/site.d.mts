export interface SiteCopy {
  url: string;
  read(file: string): string;
  write(file: string, text: string): void;
  close(): Promise<void>;
}
export function startSiteCopy(dist: string): Promise<SiteCopy>;
