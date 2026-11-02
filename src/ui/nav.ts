/** Every tab in the app, grouped for the sidebar. */
import type { IconName } from './icons';

export type Tab =
  | 'home'
  | 'sim'
  | 'learn'
  | 'procedures'
  | 'cases'
  | 'designs'
  | 'quiz'
  | 'equipment'
  | 'never'
  | 'glossary'
  | 'safety'
  | 'tools'
  | 'tips'
  | 'career'
  | 'codes'
  | 'uptime'
  | 'change'
  | 'feedback'
  | 'about';

export interface NavItem {
  id: Tab;
  label: string;
  short: string;
  icon: IconName;
  group: 'Start' | 'Practice' | 'Know your gear' | 'Work safe' | 'Connect';
  desc: string;
}

export const NAV: NavItem[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: 'home', group: 'Start', desc: 'Your progress and where to go next.' },
  { id: 'sim', label: 'Simulator', short: 'Sim', icon: 'bolt', group: 'Practice', desc: 'Break the plant on purpose and watch the backups catch it.' },
  { id: 'learn', label: 'Learn', short: 'Learn', icon: 'book', group: 'Practice', desc: 'Step-by-step walkthroughs, electrical and mechanical.' },
  { id: 'procedures', label: 'Procedures & Drills', short: 'MOPs', icon: 'list', group: 'Practice', desc: 'Run MOPs and emergency drills on the live plant. Scored.' },
  { id: 'cases', label: 'Case Studies', short: 'Cases', icon: 'clipboard', group: 'Practice', desc: 'Six incidents, root-caused. Timeline, five whys, and what changed.' },
  { id: 'career', label: 'Career', short: 'Career', icon: 'people', group: 'Practice', desc: 'Interview practice, the career path, and a shift handoff from the live plant.' },
  { id: 'quiz', label: 'Quiz', short: 'Quiz', icon: 'target', group: 'Practice', desc: 'Test yourself, or take the timed exam. Wrong answers explain why.' },
  { id: 'equipment', label: 'Equipment', short: 'Gear', icon: 'wrench', group: 'Know your gear', desc: 'Rounds, PM, troubleshooting for every component.' },
  { id: 'tips', label: 'Tips & Tricks', short: 'Tips', icon: 'star', group: 'Know your gear', desc: 'Over 200 quick tips, memory aids like CCME and BOY, and in-a-pinch moves.' },
  { id: 'tools', label: 'Field Tools', short: 'Tools', icon: 'calc', group: 'Know your gear', desc: 'Calculators: amps, UPS runtime, fuel, cooling, PUE, battery life.' },
  { id: 'designs', label: 'Designs & PUE', short: 'Designs', icon: 'layers', group: 'Know your gear', desc: 'Compare redundancy designs side by side, and see where the power goes.' },
  { id: 'never', label: 'Never Do', short: 'Never', icon: 'warning', group: 'Know your gear', desc: 'Hard stops you must never cross.' },
  { id: 'glossary', label: 'Glossary', short: 'Terms', icon: 'search', group: 'Know your gear', desc: 'The words you\'ll hear on the floor.' },
  { id: 'safety', label: 'Safety', short: 'Safety', icon: 'shield', group: 'Work safe', desc: 'Golden rules, boundary and LOTO drills, hazard hunts, emergency cards, and a pre-task brief.' },
  { id: 'codes', label: 'Codes & Standards', short: 'Codes', icon: 'scale', group: 'Work safe', desc: 'OSHA, NFPA, ASHRAE, EPA in plain English.' },
  { id: 'uptime', label: 'Uptime', short: 'Uptime', icon: 'pulse', group: 'Work safe', desc: 'Habits that keep the load running.' },
  { id: 'change', label: 'Change Mgmt', short: 'Change', icon: 'change', group: 'Work safe', desc: 'MOC: how changes are reviewed, approved, and done.' },
  { id: 'feedback', label: 'Feedback', short: 'Feedback', icon: 'chat', group: 'Connect', desc: 'Ideas, corrections, and requests.' },
  { id: 'about', label: 'About & Privacy', short: 'About', icon: 'info', group: 'Connect', desc: 'What this is, privacy, and terms.' },
];

export const GROUPS = ['Start', 'Practice', 'Know your gear', 'Work safe', 'Connect'] as const;

/** Phone bottom bar: the four most-used tabs plus "More" (Quiz lives in More). */
export const BOTTOM: Tab[] = ['home', 'sim', 'learn', 'tips'];

export const TAB_IDS = NAV.map((n) => n.id);
