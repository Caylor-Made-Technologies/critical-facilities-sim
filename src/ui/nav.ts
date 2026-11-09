/** Every tab in the app, grouped for the sidebar. */
import type { IconName } from './icons';

export type Tab =
  | 'home'
  | 'mypath'
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

export type NavGroup = 'Start' | 'Simulator' | 'Learn' | 'Practice' | 'Reference' | 'Me';

export interface NavItem {
  id: Tab;
  label: string;
  short: string;
  icon: IconName;
  group: NavGroup;
  desc: string;
}

/**
 * Grouped by what you're trying to do (UI v2, Phase 6b): see it (Simulator), learn it (Learn), prove it
 * (Practice), look it up on shift (Reference), and your own stuff (Me). Tab ids never change, so every old
 * #/ link still works.
 */
export const NAV: NavItem[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: 'home', group: 'Start', desc: 'Your progress and where to go next.' },
  { id: 'sim', label: 'Simulator', short: 'Sim', icon: 'bolt', group: 'Simulator', desc: 'Break the plant on purpose and watch the backups catch it.' },
  { id: 'designs', label: 'Designs & PUE', short: 'Designs', icon: 'layers', group: 'Simulator', desc: 'Compare redundancy designs side by side, and see where the power goes.' },
  { id: 'learn', label: 'Learn', short: 'Learn', icon: 'book', group: 'Learn', desc: 'Step-by-step walkthroughs, electrical and mechanical.' },
  { id: 'equipment', label: 'Equipment', short: 'Gear', icon: 'wrench', group: 'Learn', desc: 'Rounds, PM, troubleshooting for every component.' },
  { id: 'safety', label: 'Safety', short: 'Safety', icon: 'shield', group: 'Learn', desc: 'Golden rules, boundary and LOTOTO drills, hazard hunts, emergency cards, and a pre-task brief.' },
  { id: 'cases', label: 'Case Studies', short: 'Cases', icon: 'clipboard', group: 'Learn', desc: 'Six incidents, root-caused. Timeline, five whys, and what changed.' },
  { id: 'procedures', label: 'Procedures & Drills', short: 'Practice', icon: 'list', group: 'Practice', desc: 'Run MOPs and emergency drills on the live plant. Scored.' },
  { id: 'quiz', label: 'Quiz', short: 'Quiz', icon: 'target', group: 'Practice', desc: 'Test yourself, or take the timed exam. Wrong answers explain why.' },
  { id: 'tips', label: 'Tips & Tricks', short: 'Tips', icon: 'star', group: 'Reference', desc: 'Over 200 quick tips, memory aids like CCME and BOY, and in-a-pinch moves.' },
  { id: 'tools', label: 'Field Tools', short: 'Tools', icon: 'calc', group: 'Reference', desc: 'Calculators: amps, UPS runtime, fuel, cooling, PUE, battery life.' },
  { id: 'glossary', label: 'Glossary', short: 'Terms', icon: 'search', group: 'Reference', desc: 'The words you\'ll hear on the floor.' },
  { id: 'never', label: 'Never Do', short: 'Never', icon: 'warning', group: 'Reference', desc: 'Hard stops you must never cross.' },
  { id: 'codes', label: 'Codes & Standards', short: 'Codes', icon: 'scale', group: 'Reference', desc: 'OSHA, NFPA, ASHRAE, EPA in plain English.' },
  { id: 'uptime', label: 'Uptime', short: 'Uptime', icon: 'pulse', group: 'Reference', desc: 'Habits that keep the load running.' },
  { id: 'change', label: 'Change Mgmt', short: 'Change', icon: 'change', group: 'Reference', desc: 'MOC: how changes are reviewed, approved, and done.' },
  { id: 'mypath', label: 'My Blueprint', short: 'Blueprint', icon: 'blueprint', group: 'Me', desc: 'The Caylor Made Blueprint: your career, engineered. Resume, a few questions, a skill check, and a week-by-week plan built for you.' },
  { id: 'career', label: 'Career', short: 'Career', icon: 'people', group: 'Me', desc: 'Interview practice, the career path, and a shift handoff from the live plant.' },
  { id: 'feedback', label: 'Feedback', short: 'Feedback', icon: 'chat', group: 'Me', desc: 'Ideas, corrections, and requests.' },
  { id: 'about', label: 'About & Privacy', short: 'About', icon: 'info', group: 'Me', desc: 'What this is, privacy, and terms.' },
];

export const GROUPS = ['Start', 'Simulator', 'Learn', 'Practice', 'Reference', 'Me'] as const satisfies readonly NavGroup[];

/** One line per group, shown in the phone "More" sheet. */
export const GROUP_DESC: Record<NavGroup, string> = {
  Start: 'Your progress and what to do next.',
  Simulator: 'See it: the live plant and the designs behind it.',
  Learn: 'Understand it: lessons, equipment, safety and real incidents.',
  Practice: 'Prove it: scored MOPs, drills, rounds and quizzes.',
  Reference: 'Look it up on shift: tips, calculators, terms and rules.',
  Me: 'Your path, your career, and this app.',
};

/** Phone bottom bar: Home, the simulator, learning and practice, plus "More" (everything else, grouped). */
export const BOTTOM: Tab[] = ['home', 'sim', 'learn', 'procedures'];

export const TAB_IDS = NAV.map((n) => n.id);
