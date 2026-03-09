export interface Activity {
  id: string;
  name: string;
  emoji: string;
  goalMinutes: number;
  color: string;
  createdAt: number;
}

export type AppTheme = 'light' | 'dark' | 'system';
export type AccentColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'blue' | 'violet';

export interface AppSettings {
  theme: AppTheme;
  accentColor: AccentColor;
}

export interface Session {
  id: string;
  activityId: string;
  startTime: number;
  endTime?: number;
  durationMs: number;
}

export type ViewRange = 'today' | 'week' | 'month';
export type ChartType = 'pie' | 'bar' | 'line';
