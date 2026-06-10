"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Save, Loader2, RotateCcw, AlertTriangle, CheckCircle2, Info, Power } from "lucide-react";
import toast from "react-hot-toast";

type ModuleInfo = { id: string; label: string; section: string };

const FEATURE_DEPS: Record<string, string[]> = {
  studymate:   ["wallet"],
  rewards:     ["wallet"],
  refer:       ["wallet"],
  leaderboard: ["streaks"],
  "meet-addon":["wallet"],
};

const PLAN_LABELS: Record<string, string> = {
  TRIAL:   "Trial",
  MONTHLY: "Monthly",
  YEARLY:  "Yearly",
};

const PLAN_COLORS: Record<string, string> = {
  TRIAL:   "bg-amber-50 border-amber-200 text-amber-700",
  MONTHLY: "bg-blue-50 border-blue-200 text-blue-700",
  YEARLY:  "bg-indigo-50 border-indigo-200 text-indigo-700",
};

function getDependents(featureId: string): string[] {
  return Object.entries(FEATURE_DEPS)
    .filter(([, deps]) => deps.includes(featureId))
    .map(([feat]) => feat);
}

export default function PlanFeaturesPage() {
  const [map, setMap] = useState<Record<string, string[]>>({});
  const [plans, setPlans] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [flagEnabled, setFlagEnabled] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/plan-features");
      const d = await r.json();
      setMap(d.map ?? {});
      setPlans(d.plans ?? []);
      setModules(d.modules ?? []);
      setFlagEnabled(d.enabled ?? false);
    } catch {
      toast.error("Failed to load plan features");
    } finally {
      setLoading(false);
    }
  }, []);

  async function toggleFlag() {
    setTogglingFlag(true);
    try {
      const next = !flagEnabled;
      const r = await fetch("/api/admin/plan-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!r.ok) throw new Error();
      setFlagEnabled(next);
      toast.success(next ? "Plan gating ENABLED" : "Plan gating DISABLED — all features open");
    } catch {
      toast.error("Failed to update flag");
    } finally {
      setTogglingFlag(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  // Validate dependencies and show warnings
  useEffect(() => {
    const w: string[] = [];
    for (const plan of plans) {
      const features = map[plan] ?? [];
      for (const [feat, deps] of Object.entries(FEATURE_DEPS)) {
        if (features.includes(feat)) {
          for (const dep of deps) {
            if (!features.includes(dep)) {
              const featLabel = modules.find(m => m.id === feat)?.label ?? feat;
              const depLabel  = modules.find(m => m.id === dep)?.label ?? dep;
              w.push(`${PLAN_LABELS[plan] ?? plan}: "${featLabel}" is ON but "${depLabel}" is OFF — ${featLabel} will not work.`);
            }
          }
        }
      }
    }
    setWarnings(w);
  }, [map, plans, modules]);

  function toggle(plan: string, moduleId: string) {
    setMap(prev => {
      const current = new Set(prev[plan] ?? []);
      const isOn = current.has(moduleId);

      if (isOn) {
        // Turning OFF — also turn off anything that depends on this
        const dependents = getDependents(moduleId);
        dependents.forEach(d => current.delete(d));
        current.delete(moduleId);
      } else {
        // Turning ON — also turn on required dependencies
        const deps = FEATURE_DEPS[moduleId] ?? [];
        deps.forEach(d => current.add(d));
        current.add(moduleId);
      }

      return { ...prev, [plan]: [...current] };
    });
  }

  function toggleAll(plan: string, checked: boolean) {
    setMap(prev => ({
      ...prev,
      [plan]: checked ? modules.map(m => m.id) : [],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/plan-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(map),
      });
      if (!r.ok) throw new Error("Save failed");
      toast.success("Plan features saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const sections = [...new Set(modules.map(m => m.section))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plan Feature Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control which features are active for each subscription plan. Dependencies are auto-enforced.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Master toggle */}
      <div className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
        flagEnabled
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-200 bg-gray-50"
      }`}>
        <div className="flex items-center gap-3">
          <Power className={`h-5 w-5 ${flagEnabled ? "text-emerald-600" : "text-gray-400"}`} />
          <div>
            <p className={`text-sm font-semibold ${flagEnabled ? "text-emerald-800" : "text-gray-700"}`}>
              Plan Gating — {flagEnabled ? "ACTIVE" : "INACTIVE"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {flagEnabled
                ? "Students can only access features allowed by their plan."
                : "Disabled — all students have access to all features regardless of plan."}
            </p>
          </div>
        </div>
        <button
          onClick={toggleFlag}
          disabled={togglingFlag}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
            flagEnabled ? "bg-emerald-500 border-emerald-500" : "bg-gray-200 border-gray-200"
          }`}
        >
          {togglingFlag && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-3 w-3 animate-spin text-white" />
            </span>
          )}
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            flagEnabled ? "translate-x-5" : "translate-x-0.5"
          } ${togglingFlag ? "opacity-0" : ""}`} />
        </button>
      </div>

      {/* Dependency warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Dependency Warnings
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 ml-6">{w}</p>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Turning a feature <b>ON</b> automatically enables its dependencies.
          Turning a feature <b>OFF</b> automatically disables features that depend on it.
          <b> Profile, Settings, Feedback, Profile Form</b> are always accessible regardless of plan.
        </span>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">
                  Feature
                </th>
                {plans.map(plan => {
                  const features = map[plan] ?? [];
                  const allOn = modules.every(m => features.includes(m.id));
                  return (
                    <th key={plan} className="px-4 py-3 text-center min-w-[110px]">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-700"}`}>
                          {PLAN_LABELS[plan] ?? plan}
                        </span>
                        <label className="flex items-center gap-1 cursor-pointer text-[10px] text-gray-400 font-normal">
                          <input type="checkbox" checked={allOn}
                            onChange={e => toggleAll(plan, e.target.checked)}
                            className="h-3 w-3 rounded accent-indigo-600" />
                          All
                        </label>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <React.Fragment key={section}>
                  <tr className="bg-gray-50/70">
                    <td colSpan={plans.length + 1}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {section}
                    </td>
                  </tr>
                  {modules.filter(m => m.section === section).map(mod => {
                    const deps = FEATURE_DEPS[mod.id] ?? [];
                    const dependents = getDependents(mod.id);
                    const isAlwaysOn = ["profile","settings","feedback","profile-form"].includes(mod.id);

                    return (
                      <tr key={mod.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-gray-800 text-xs">{mod.label}</span>
                            {isAlwaysOn && (
                              <span className="text-[10px] text-emerald-600 font-medium">Always active</span>
                            )}
                            {deps.length > 0 && (
                              <span className="text-[10px] text-gray-400">
                                needs: {deps.map(d => modules.find(m => m.id === d)?.label ?? d).join(", ")}
                              </span>
                            )}
                            {dependents.length > 0 && (
                              <span className="text-[10px] text-orange-400">
                                required by: {dependents.map(d => modules.find(m => m.id === d)?.label ?? d).join(", ")}
                              </span>
                            )}
                          </div>
                        </td>
                        {plans.map(plan => {
                          const features = map[plan] ?? [];
                          const isOn = isAlwaysOn || features.includes(mod.id);
                          return (
                            <td key={plan} className="px-4 py-2.5 text-center">
                              {isAlwaysOn ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isOn}
                                  onChange={() => toggle(plan, mod.id)}
                                  className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map(plan => {
          const features = map[plan] ?? [];
          return (
            <div key={plan} className={`rounded-xl border p-4 ${PLAN_COLORS[plan] ?? "border-gray-200 bg-white"}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2">
                {PLAN_LABELS[plan] ?? plan} — {features.length} features
              </p>
              <div className="flex flex-wrap gap-1">
                {features.map(f => (
                  <span key={f} className="rounded-md bg-white/60 border border-current/20 px-1.5 py-0.5 text-[10px] font-medium">
                    {modules.find(m => m.id === f)?.label ?? f}
                  </span>
                ))}
                {features.length === 0 && (
                  <span className="text-[11px] opacity-60">No features enabled</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
