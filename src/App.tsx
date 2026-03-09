/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Play, 
  Square, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Clock, 
  Settings, 
  Trash2, 
  Edit2,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Calendar,
  X,
  Download,
  Upload,
  Database,
  Moon,
  Sun,
  Monitor,
  Palette,
  Check
} from 'lucide-react';
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line, 
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  eachDayOfInterval,
  subDays,
  subMonths,
  addMonths,
  getDay,
  differenceInMinutes
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Session, ViewRange, ChartType, AppSettings, AppTheme, AccentColor } from './types';
import { cn, formatDuration, formatMinutes } from './utils';

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
];

export default function App() {
  // State
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('chrono_activities');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('chrono_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('chrono_settings');
    return saved ? JSON.parse(saved) : { theme: 'light', accentColor: 'indigo' };
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [viewRange, setViewRange] = useState<ViewRange>('today');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Refs
  const timerRef = useRef<number | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('chrono_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('chrono_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('chrono_settings', JSON.stringify(settings));
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }

    // Apply accent color
    const accentColors: Record<AccentColor, string> = {
      indigo: '#6366f1',
      rose: '#f43f5e',
      emerald: '#10b981',
      amber: '#f59e0b',
      blue: '#3b82f6',
      violet: '#8b5cf6'
    };
    root.style.setProperty('--accent-primary', accentColors[settings.accentColor]);
  }, [settings]);

  // Timer logic
  useEffect(() => {
    if (activeSessionId) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSessionId]);

  // Handlers
  const addActivity = (name: string, goalMinutes: number, color: string, emoji: string) => {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      name,
      emoji,
      goalMinutes,
      color,
      createdAt: Date.now(),
    };
    setActivities([...activities, newActivity]);
    setIsAddingActivity(false);
  };

  const editActivity = (id: string, name: string, goalMinutes: number, color: string, emoji: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, name, goalMinutes, color, emoji } : a));
    setEditingActivityId(null);
  };

  const deleteActivity = (id: string) => {
    if (confirm('Are you sure you want to delete this activity and all its history?')) {
      setActivities(activities.filter(a => a.id !== id));
      setSessions(sessions.filter(s => s.activityId !== id));
      if (activeSessionId) {
        const activeSession = sessions.find(s => s.id === activeSessionId);
        if (activeSession?.activityId === id) {
          setActiveSessionId(null);
        }
      }
    }
  };

  const startTimer = (activityId: string) => {
    // Stop any existing active session
    if (activeSessionId) {
      stopTimer();
    }

    const newSession: Session = {
      id: crypto.randomUUID(),
      activityId,
      startTime: Date.now(),
      durationMs: 0,
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
  };

  const stopTimer = () => {
    if (!activeSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const endTime = Date.now();
        return {
          ...s,
          endTime,
          durationMs: endTime - s.startTime
        };
      }
      return s;
    }));
    setActiveSessionId(null);
  };

  const exportData = () => {
    const data = {
      activities,
      sessions,
      settings,
      version: '1.1',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronotrack-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.activities || !json.sessions) {
          throw new Error('Invalid backup file format');
        }
        
        if (confirm('Importing data will merge with your existing activities and sessions. Continue?')) {
          // Merge logic: avoid duplicate IDs
          const existingActivityIds = new Set(activities.map(a => a.id));
          const existingSessionIds = new Set(sessions.map(s => s.id));

          const newActivities = json.activities.filter((a: Activity) => !existingActivityIds.has(a.id));
          const newSessions = json.sessions.filter((s: Session) => !existingSessionIds.has(s.id));

          if (json.settings) {
            setSettings(json.settings);
          }

          setActivities(prev => [...prev, ...newActivities]);
          setSessions(prev => [...prev, ...newSessions]);
          alert(`Import successful! Added ${newActivities.length} activities and ${newSessions.length} sessions.`);
        }
      } catch (err) {
        alert('Error importing data: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  // Derived Data
  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId), 
  [sessions, activeSessionId]);

  const activeActivity = useMemo(() => 
    activities.find(a => a.id === activeSession?.activityId),
  [activities, activeSession]);

  const currentSessionDuration = activeSession ? currentTime - activeSession.startTime : 0;

  const filteredSessions = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    if (viewRange === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (viewRange === 'week') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    return sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return isWithinInterval(sessionDate, { start, end });
    });
  }, [sessions, viewRange]);

  const statsByActivity = useMemo(() => {
    const stats: Record<string, number> = {};
    
    filteredSessions.forEach(s => {
      const duration = s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0);
      stats[s.activityId] = (stats[s.activityId] || 0) + duration;
    });

    return activities.map(a => ({
      name: a.name,
      value: Math.round((stats[a.id] || 0) / (1000 * 60)), // in minutes
      color: a.color,
      goal: a.goalMinutes
    })).filter(s => s.value > 0 || viewRange === 'today');
  }, [activities, filteredSessions, activeSessionId, currentSessionDuration, viewRange]);

  const chartData = useMemo(() => {
    if (viewRange === 'today') {
      return statsByActivity;
    }

    // For week/month, we want a time series
    const now = new Date();
    let start: Date, end: Date;
    if (viewRange === 'week') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const daySessions = sessions.filter(s => 
        isWithinInterval(new Date(s.startTime), { start: dayStart, end: dayEnd })
      );

      const data: any = { date: format(day, 'MMM dd') };
      activities.forEach(a => {
        const duration = daySessions
          .filter(s => s.activityId === a.id)
          .reduce((acc, s) => acc + (s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0)), 0);
        data[a.name] = Math.round(duration / (1000 * 60));
      });
      return data;
    });
  }, [viewRange, sessions, activities, activeSessionId, currentSessionDuration, statsByActivity]);

  const totalMinutesToday = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return sessions
      .filter(s => isWithinInterval(new Date(s.startTime), { start: todayStart, end: todayEnd }))
      .reduce((acc, s) => acc + (s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0)), 0) / (1000 * 60);
  }, [sessions, activeSessionId, currentSessionDuration]);

  const dailyGoalTotal = useMemo(() => 
    activities.reduce((acc, a) => acc + a.goalMinutes, 0),
  [activities]);

  const streakInfo = useMemo(() => {
    if (!selectedActivityId) return null;
    const activity = activities.find(a => a.id === selectedActivityId);
    if (!activity) return null;

    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const history = daysInMonth.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayMinutes = sessions
        .filter(s => s.activityId === selectedActivityId && isWithinInterval(new Date(s.startTime), { start: dayStart, end: dayEnd }))
        .reduce((acc, s) => acc + (s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0)), 0) / (1000 * 60);
      
      return { date, isComplete: dayMinutes >= activity.goalMinutes };
    });

    // Calculate streaks (still based on overall history, not just current month)
    const today = startOfDay(new Date());
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // For longest streak, we need a larger window or all history
    // Let's check last 365 days for streaks
    for (let i = 365; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayMinutes = sessions
        .filter(s => s.activityId === selectedActivityId && isWithinInterval(new Date(s.startTime), { start: dayStart, end: dayEnd }))
        .reduce((acc, s) => acc + (s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0)), 0) / (1000 * 60);
      
      if (dayMinutes >= activity.goalMinutes) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Current streak
    for (let i = 0; i <= 365; i++) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayMinutes = sessions
        .filter(s => s.activityId === selectedActivityId && isWithinInterval(new Date(s.startTime), { start: dayStart, end: dayEnd }))
        .reduce((acc, s) => acc + (s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0)), 0) / (1000 * 60);
      
      if (dayMinutes >= activity.goalMinutes) {
        currentStreak++;
      } else {
        if (i > 0) break;
      }
    }

    return { current: currentStreak, longest: longestStreak, history, monthStart };
  }, [selectedActivityId, activities, sessions, activeSessionId, currentSessionDuration, calendarDate]);

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64">
      {/* Sidebar / Navigation */}
      <aside className="fixed bottom-0 left-0 z-50 w-full lg:top-0 lg:w-64 lg:h-full bg-[var(--bg-card)] border-t lg:border-t-0 lg:border-r border-[var(--border-color)] px-4 py-2 lg:py-8 flex lg:flex-col justify-between items-center lg:items-stretch">
        <div className="flex lg:flex-col items-center lg:items-stretch w-full gap-4 lg:gap-8">
          <div className="hidden lg:flex items-center gap-2 px-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">EveryHour</span>
          </div>

          <nav className="flex lg:flex-col items-center lg:items-stretch justify-around w-full gap-1">
            <NavButton 
              icon={<TrendingUp />} 
              label="Dashboard" 
              active={currentTab === 'dashboard'} 
              onClick={() => setCurrentTab('dashboard')}
            />
            <NavButton 
              icon={<Settings />} 
              label="Settings" 
              active={currentTab === 'settings'} 
              onClick={() => setCurrentTab('settings')}
            />
          </nav>
        </div>

        <div className="hidden lg:block p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Daily Goal</span>
            <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>{Math.round((totalMinutesToday / (dailyGoalTotal || 1)) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
            <motion.div 
              className="h-full"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalMinutesToday / (dailyGoalTotal || 1)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            {formatMinutes(Math.round(totalMinutesToday))} of {formatMinutes(dailyGoalTotal)} goal
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        {currentTab === 'dashboard' ? (
          <>
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Good Day!</h1>
                <p className="text-[var(--text-muted)]">Track your progress and stay focused on your goals.</p>
              </div>
              <button 
                onClick={() => setIsAddingActivity(true)}
                className="flex items-center justify-center gap-2 bg-[var(--text-main)] text-[var(--bg-main)] px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Activity
              </button>
            </header>

            {/* Active Timer Banner */}
            <AnimatePresence>
              {activeSession && activeActivity && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-10 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
                  style={{ backgroundColor: activeActivity.color, boxShadow: `0 20px 25px -5px ${activeActivity.color}40` }}
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm text-3xl">
                      {activeActivity.emoji}
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Currently Tracking</p>
                      <h2 className="text-2xl font-bold">{activeActivity.name}</h2>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center md:items-end gap-4 relative z-10">
                    <div className="font-mono text-5xl font-bold tracking-tighter">
                      {formatDuration(currentSessionDuration)}
                    </div>
                    <button 
                      onClick={stopTimer}
                      className="bg-white text-zinc-900 px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-50 transition-colors shadow-lg"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      Stop Timer
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Activities Grid */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-zinc-400" />
                    Your Activities
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activities.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-zinc-100 rounded-3xl border-2 border-dashed border-zinc-200">
                      <p className="text-zinc-400 mb-4">No activities yet. Start by adding one!</p>
                      <button 
                        onClick={() => setIsAddingActivity(true)}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        + Add your first activity
                      </button>
                    </div>
                  ) : (
                    activities.map(activity => {
                      const isTracking = activeSession?.activityId === activity.id;
                      const todayMinutes = sessions
                        .filter(s => s.activityId === activity.id && isWithinInterval(new Date(s.startTime), { start: startOfDay(new Date()), end: endOfDay(new Date()) }))
                        .reduce((acc, s) => acc + (s.endTime ? s.durationMs : (s.id === activeSessionId ? currentSessionDuration : 0)), 0) / (1000 * 60);
                      
                      return (
                        <motion.div 
                          key={activity.id}
                          layout
                          className={cn(
                            "group p-5 rounded-3xl border transition-all duration-300",
                            isTracking ? "shadow-lg ring-1" : "hover:shadow-md"
                          )}
                          style={{ 
                            backgroundColor: isTracking ? `${activity.color}15` : 'var(--bg-card)',
                            borderColor: isTracking ? activity.color : 'var(--border-color)',
                            boxShadow: isTracking ? `0 10px 15px -3px ${activity.color}30` : 'none'
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                                style={{ backgroundColor: activity.color }}
                              >
                                {activity.emoji}
                              </div>
                              <div>
                                <h3 className="font-bold text-[var(--text-main)]">{activity.name}</h3>
                                <p className="text-sm font-bold" style={{ color: activity.color }}>Goal: {formatMinutes(activity.goalMinutes)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => setEditingActivityId(activity.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteActivity(activity.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {todayMinutes >= activity.goalMinutes && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <Check className="w-3 h-3" />
                                    Complete
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                {isTracking ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xl font-bold font-mono" style={{ color: activity.color }}>
                                      {formatDuration(currentSessionDuration)}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] opacity-60 font-medium">
                                      Total: {formatMinutes(Math.round(todayMinutes))}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xl font-bold text-[var(--text-main)]">
                                    {formatMinutes(Math.round(todayMinutes))}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full rounded-full"
                                style={{ backgroundColor: activity.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (todayMinutes / activity.goalMinutes) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <button 
                            onClick={() => isTracking ? stopTimer() : startTimer(activity.id)}
                            className={cn(
                              "w-full mt-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                              isTracking 
                                ? "bg-rose-500 text-white hover:bg-rose-600" 
                                : "bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            )}
                            style={!isTracking ? { 
                              backgroundColor: `${activity.color}10`,
                              color: activity.color
                            } : {}}
                          >
                            {isTracking ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                            {isTracking ? 'Stop Tracking' : 'Start Timer'}
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Analytics Sidebar */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[var(--text-muted)]" />
                    Analytics
                  </h2>
                </div>

                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm space-y-6">
                  <div className="flex flex-wrap gap-2 p-1 bg-[var(--bg-main)] rounded-xl">
                    <RangeToggle active={viewRange === 'today'} onClick={() => setViewRange('today')}>Today</RangeToggle>
                    <RangeToggle active={viewRange === 'week'} onClick={() => setViewRange('week')}>Week</RangeToggle>
                    <RangeToggle active={viewRange === 'month'} onClick={() => setViewRange('month')}>Month</RangeToggle>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <ChartToggle active={chartType === 'pie'} onClick={() => setChartType('pie')} icon={<PieChart />} />
                      <ChartToggle active={chartType === 'bar'} onClick={() => setChartType('bar')} icon={<BarChart3 />} />
                      <ChartToggle active={chartType === 'line'} onClick={() => setChartType('line')} icon={<LineChart />} />
                    </div>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    {statsByActivity.length === 0 ? (
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
                          <BarChart3 className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] font-medium">No data for this period</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'pie' ? (
                          <RePieChart>
                            <Pie
                              data={statsByActivity}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {statsByActivity.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                              formatter={(value: number) => [`${value} min`, 'Duration']}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                          </RePieChart>
                        ) : chartType === 'bar' ? (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey={viewRange === 'today' ? 'name' : 'date'} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                              cursor={{ fill: 'var(--bg-main)' }}
                            />
                            {viewRange === 'today' ? (
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {statsByActivity.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            ) : (
                              activities.map(a => (
                                <Bar key={a.id} dataKey={a.name} fill={a.color} stackId="a" radius={[2, 2, 0, 0]} />
                              ))
                            )}
                          </BarChart>
                        ) : (
                          <ReLineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                            <XAxis dataKey={viewRange === 'today' ? 'name' : 'date'} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                            />
                            {activities.map(a => (
                              <Line key={a.id} type="monotone" dataKey={a.name} stroke={a.color} strokeWidth={3} dot={{ r: 4, fill: a.color, strokeWidth: 2, stroke: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                            ))}
                          </ReLineChart>
                        )}
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-main)]">Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Total Time</p>
                        <p className="text-lg font-bold text-[var(--text-main)]">
                          {formatMinutes(Math.round(statsByActivity.reduce((acc, s) => acc + s.value, 0)))}
                        </p>
                      </div>
                      <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Activities</p>
                        <p className="text-lg font-bold text-[var(--text-main)]">{statsByActivity.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Streaks & Completion History */}
                <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[var(--text-main)]">Streaks & History</h3>
                      <select 
                        value={selectedActivityId || ''} 
                        onChange={(e) => setSelectedActivityId(e.target.value || null)}
                        className="text-xs bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      >
                        <option value="">Select Activity</option>
                        {activities.map(a => (
                          <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                        ))}
                      </select>
                    </div>

                    {streakInfo && (
                      <div className="flex items-center justify-between bg-[var(--bg-main)] p-2 rounded-xl border border-[var(--border-color)]">
                        <button 
                          onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                          className="p-1 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {format(calendarDate, 'MMMM yyyy')}
                        </span>
                        <button 
                          onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                          className="p-1 hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {streakInfo ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] text-center">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Current Streak</p>
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                            <p className="text-xl font-bold text-[var(--text-main)]">{streakInfo.current} days</p>
                          </div>
                        </div>
                        <div className="p-3 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] text-center">
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Longest Streak</p>
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                            <p className="text-xl font-bold text-[var(--text-main)]">{streakInfo.longest} days</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                            <span key={d} className="text-[9px] font-bold text-[var(--text-muted)]">{d}</span>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {/* Empty cells for padding */}
                          {Array.from({ length: getDay(streakInfo.monthStart) }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                          ))}
                          {streakInfo.history.map((day, i) => {
                            const activity = activities.find(a => a.id === selectedActivityId);
                            return (
                              <div 
                                key={i}
                                title={format(day.date, 'MMM d, yyyy')}
                                className={cn(
                                  "aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                                  day.isComplete 
                                    ? "text-white shadow-sm" 
                                    : "bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)]"
                                )}
                                style={day.isComplete ? { backgroundColor: activity?.color } : {}}
                              >
                                {format(day.date, 'd')}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-[var(--bg-main)] rounded-2xl border border-dashed border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-muted)]">Select an activity to view streaks</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="max-w-2xl mx-auto">
            <header className="mb-10">
              <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
              <p className="text-[var(--text-muted)]">Manage your data and application preferences.</p>
            </header>

            <div className="space-y-8">
              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[var(--accent-primary)]/10 rounded-2xl flex items-center justify-center" style={{ color: 'var(--accent-primary)' }}>
                    <Palette className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">App Appearance</h2>
                    <p className="text-sm text-[var(--text-muted)]">Customize how EveryHour looks on your device.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">Theme Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', icon: <Sun />, label: 'Light' },
                        { id: 'dark', icon: <Moon />, label: 'Dark' },
                        { id: 'system', icon: <Monitor />, label: 'System' }
                      ].map(t => (
                        <button 
                          key={t.id}
                          onClick={() => setSettings({ ...settings, theme: t.id as AppTheme })}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-medium",
                            settings.theme === t.id 
                              ? "text-white shadow-lg" 
                              : "bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-main)]"
                          )}
                          style={settings.theme === t.id ? { backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' } : {}}
                        >
                          {React.cloneElement(t.icon as React.ReactElement, { className: "w-4 h-4" })}
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                      {(['indigo', 'rose', 'emerald', 'amber', 'blue', 'violet'] as AccentColor[]).map(c => {
                        const colors: Record<AccentColor, string> = {
                          indigo: '#6366f1', rose: '#f43f5e', emerald: '#10b981', 
                          amber: '#f59e0b', blue: '#3b82f6', violet: '#8b5cf6'
                        };
                        return (
                          <button 
                            key={c}
                            onClick={() => setSettings({ ...settings, accentColor: c })}
                            className={cn(
                              "w-10 h-10 rounded-xl transition-all flex items-center justify-center",
                              settings.accentColor === c ? "ring-4 ring-[var(--border-color)] scale-110" : "hover:scale-105"
                            )}
                            style={{ backgroundColor: colors[c] }}
                          >
                            {settings.accentColor === c && <Check className="w-5 h-5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[var(--accent-primary)]/10 rounded-2xl flex items-center justify-center" style={{ color: 'var(--accent-primary)' }}>
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Data Management</h2>
                    <p className="text-sm text-[var(--text-muted)]">Backup or restore your activities and tracking history.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] space-y-4">
                    <div className="flex items-center gap-2 text-[var(--text-main)] font-bold">
                      <Download className="w-5 h-5" />
                      Export Data
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Download all your activities and time tracking sessions as a JSON file.
                    </p>
                    <button 
                      onClick={exportData}
                      className="w-full py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors shadow-sm"
                    >
                      Download Backup
                    </button>
                  </div>

                  <div className="p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] space-y-4">
                    <div className="flex items-center gap-2 text-[var(--text-main)] font-bold">
                      <Upload className="w-5 h-5" />
                      Import Data
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Restore your data from a previously exported JSON backup file.
                    </p>
                    <label className="block w-full">
                      <span className="sr-only">Choose backup file</span>
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={importData}
                        className="block w-full text-sm text-[var(--text-muted)]
                          file:mr-4 file:py-3 file:px-4
                          file:rounded-xl file:border-0
                          file:text-sm file:font-bold
                          file:bg-[var(--accent-primary)] file:text-white
                          hover:file:opacity-90
                          cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-color)] shadow-sm">
                <h2 className="text-xl font-bold mb-6">Danger Zone</h2>
                <div className="p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-rose-500">Clear All Data</h3>
                    <p className="text-xs text-rose-500/70">This will permanently delete all activities and tracking history.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Are you absolutely sure? This cannot be undone.')) {
                        setActivities([]);
                        setSessions([]);
                        setActiveSessionId(null);
                        localStorage.clear();
                        alert('All data cleared.');
                      }
                    }}
                    className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/20"
                  >
                    Reset App
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Add Activity Modal */}
      <AnimatePresence>
        {(isAddingActivity || editingActivityId) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingActivity(false); setEditingActivityId(null); }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] rounded-[32px] shadow-2xl overflow-hidden border border-[var(--border-color)]"
            >
              <div className="p-8 text-[var(--text-main)]">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">{editingActivityId ? 'Edit Activity' : 'New Activity'}</h2>
                  <button onClick={() => { setIsAddingActivity(false); setEditingActivityId(null); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <ActivityForm 
                  onSubmit={(name, goal, color, emoji) => {
                    if (editingActivityId) {
                      editActivity(editingActivityId, name, goal, color, emoji);
                    } else {
                      addActivity(name, goal, color, emoji);
                    }
                  }} 
                  onCancel={() => { setIsAddingActivity(false); setEditingActivityId(null); }}
                  initialData={editingActivityId ? activities.find(a => a.id === editingActivityId) : undefined}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-3 py-2 lg:py-3 rounded-xl lg:rounded-2xl transition-all w-full",
        active ? "bg-[var(--accent-primary)]/10 font-bold" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]"
      )}
      style={active ? { color: 'var(--accent-primary)' } : {}}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 lg:w-6 lg:h-6" })}
      <span className="text-[10px] lg:text-sm font-medium">{label}</span>
    </button>
  );
}

function RangeToggle({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
      )}
    >
      {children}
    </button>
  );
}

function ChartToggle({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg transition-all",
        active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-zinc-100 text-zinc-400 hover:text-zinc-600"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
    </button>
  );
}

const EMOJIS = ['🎯', '💻', '🎨', '🏃', '📚', '🎹', '🧘', '🍳', '🧹', '🌱', '✍️', '🎮', '🎧', '🛠️', '💤', '🍵'];

function ActivityForm({ onSubmit, onCancel, initialData }: { onSubmit: (name: string, goal: number, color: string, emoji: string) => void, onCancel: () => void, initialData?: Activity }) {
  const [name, setName] = useState(initialData?.name || '');
  const [goal, setGoal] = useState(initialData?.goalMinutes || 60);
  const [color, setColor] = useState(initialData?.color || COLORS[0]);
  const [emoji, setEmoji] = useState(initialData?.emoji || EMOJIS[0]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(name, goal, color, emoji); }} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Activity Name</label>
        <input 
          autoFocus
          required
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Blender Practice"
          className="w-full px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] transition-all text-lg font-medium text-[var(--text-main)]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Icon Emoji</label>
        <div className="grid grid-cols-8 gap-2">
          {EMOJIS.map(e => (
            <button 
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={cn(
                "w-10 h-10 rounded-xl transition-all flex items-center justify-center text-xl",
                emoji === e ? "bg-[var(--accent-primary)] text-white scale-110 shadow-md" : "bg-[var(--bg-main)] hover:bg-[var(--border-color)]"
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Daily Goal (Minutes)</label>
        <div className="flex items-center gap-4">
          <input 
            required
            type="number" 
            min="1"
            max="1440"
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value))}
            className="w-24 px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] transition-all text-lg font-medium text-[var(--text-main)]"
          />
          <span className="text-[var(--text-muted)] font-medium">minutes per day</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Theme Color</label>
        <div className="flex flex-wrap gap-3">
          {COLORS.map(c => (
            <button 
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "w-10 h-10 rounded-xl transition-all flex items-center justify-center",
                color === c ? "ring-4 ring-[var(--border-color)] scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            >
              {color === c && <Check className="w-5 h-5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
          style={{ backgroundColor: 'var(--accent-primary)', boxShadow: `0 10px 15px -3px var(--accent-primary)40` }}
        >
          {initialData ? 'Update Activity' : 'Create Activity'}
        </button>
      </div>
    </form>
  );
}
