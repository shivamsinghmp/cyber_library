"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Target, Zap, BookOpen, TrendingUp,
  CheckCircle, AlertCircle, Clock, Flame,
} from "lucide-react";

type ReadinessData = {
  score:            number;
  level:            string;
  weakAreas:        string[];
  strongAreas:      string[];
  recommendation:   string;
  dailyHoursNeeded: number;
  meta: {
    studyHours30d:  number;
    streak:         number;
    taskRate:       number;
    aiSessions:     number;
    coinBalance:    number;
    targetExam:     string | null;
    targetYear:     string | null;
    daysUntilExam:  number;
  };
};

const LEVEL_COLOR: Record<string, string> = {
  "Exam Ready":        "text-emerald-600",
  "Strong Foundation": "text-blue-600",
  "Getting There":     "text-[#6367FF]",
  "Building Momentum": "text-amber-600",
  "Just Starting":     "text-rose-500",
};

const SCORE_RING_COLOR: Record<string, string> = {
  "Exam Ready":        "#10b981",
  "Strong Foundation": "#3b82f6",
  "Getting There":     "#6367FF",
  "Building Momentum": "#f59e0b",
  "Just Starting":     "#f43f5e",
};

function ScoreRing({ score, level }: { score: number; level: string }) {
  const r   = 52;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, score)) / 100;
  const dash = pct * circ;
  const color = SCORE_RING_COLOR[level] ?? "#6367FF";

  return (
    <div className="relative flex items-center justify-center w-40 h-40 mx-auto">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-4xl font-black text-[var(--foreground)]">{score}</p>
        <p className="text-xs text-[var(--muted-text)] font-medium">/100</p>
      </div>
    </div>
  );
}

export default function ReadinessPage() {
  const [data, setData]   = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ai/studymate/readiness")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#6367FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="text-center py-16 text-[var(--muted-text)]">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
      Failed to calculate readiness score. Try again later.
    </div>
  );

  const levelColor = LEVEL_COLOR[data.level] ?? "text-[#6367FF]";
  const { meta } = data;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/studymate"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[var(--muted-text)]" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#6367FF]" /> Exam Readiness Score
          </h1>
          <p className="text-sm text-[var(--muted-text)]">
            {meta.targetExam ? `${meta.targetExam}${meta.targetYear ? ` ${meta.targetYear}` : ""}` : "Based on your study data"}
          </p>
        </div>
      </div>

      {/* Score card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-6 flex flex-col items-center gap-4">
        <ScoreRing score={data.score} level={data.level} />
        <div className="text-center">
          <p className={`text-xl font-bold ${levelColor}`}>{data.level}</p>
          {meta.daysUntilExam > 0 && (
            <p className="text-sm text-[var(--muted-text)] mt-1">
              {meta.daysUntilExam} days until exam
            </p>
          )}
        </div>
        <div className="bg-[#F5F4FF] rounded-xl px-4 py-3 text-sm text-[#1A1447] text-center max-w-sm">
          {data.recommendation}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Flame,      label: "Streak",        value: `${meta.streak}d`,                  color: "text-orange-500" },
          { icon: Clock,      label: "Study (30d)",   value: `${meta.studyHours30d}h`,           color: "text-blue-500"   },
          { icon: CheckCircle,label: "Task Rate",     value: `${meta.taskRate}%`,                 color: "text-emerald-500"},
          { icon: Zap,        label: "AI Sessions",   value: String(meta.aiSessions),             color: "text-[#6367FF]"  },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-[var(--muted-text)] uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-bold text-[var(--foreground)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Daily target */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5F4FF] rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#6367FF]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Daily Study Target</p>
            <p className="text-xs text-[var(--muted-text)]">Recommended to hit Exam Ready</p>
          </div>
        </div>
        <p className="text-2xl font-black text-[#6367FF]">{data.dailyHoursNeeded}h</p>
      </div>

      {/* Weak + Strong areas */}
      {(data.weakAreas.length > 0 || data.strongAreas.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.weakAreas.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
              <h3 className="text-sm font-bold text-rose-500 mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Needs More Practice
              </h3>
              <div className="flex flex-col gap-2">
                {data.weakAreas.map(area => (
                  <div key={area} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    {area}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.strongAreas.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
              <h3 className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Strong Areas
              </h3>
              <div className="flex flex-col gap-2">
                {data.strongAreas.map(area => (
                  <div key={area} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {area}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3 pb-4">
        <Link href="/dashboard/studymate"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6367FF] text-white text-sm font-semibold hover:bg-[#4f52d3] transition-colors">
          <BookOpen className="w-4 h-4" /> Ask StudyMate AI
        </Link>
        <Link href="/dashboard/studymate/usage"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors">
          <Zap className="w-4 h-4 text-[#6367FF]" /> Usage Stats
        </Link>
      </div>
    </div>
  );
}
