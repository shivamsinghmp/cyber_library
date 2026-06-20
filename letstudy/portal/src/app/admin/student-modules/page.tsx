"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle, XCircle, ToggleLeft, ToggleRight, LayoutGrid } from "lucide-react";
import toast from "react-hot-toast";

type ModuleRow = {
  id: string;
  label: string;
  href: string;
  section: string;
  enabled: boolean;
};

const SECTION_ORDER = ["Main", "Study", "Account"];

export default function StudentModulesPage() {
  const [modules, setModules]   = useState<ModuleRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/student-modules");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setModules(data.modules);
    } catch {
      toast.error("Failed to load modules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  async function toggleModule(id: string) {
    const updated = modules.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    setModules(updated);

    const disabled = updated.filter(m => !m.enabled).map(m => m.id);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/student-modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved!");
    } catch {
      toast.error("Could not save. Please try again.");
      fetchModules(); // revert
    } finally {
      setSaving(false);
    }
  }

  async function enableAll() {
    const updated = modules.map(m => ({ ...m, enabled: true }));
    setModules(updated);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/student-modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: [] }),
      });
      if (!res.ok) throw new Error();
      toast.success("All modules enabled!");
    } catch {
      toast.error("Failed. Please try again.");
      fetchModules();
    } finally {
      setSaving(false);
    }
  }

  const grouped = SECTION_ORDER.map(section => ({
    section,
    items: modules.filter(m => m.section === section),
  }));

  const disabledCount = modules.filter(m => !m.enabled).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <LayoutGrid className="h-5 w-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-gray-900">Student Modules</h1>
          </div>
          <p className="text-sm text-gray-500">
            Enable or disable features in the student sidebar. Changes apply instantly.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {disabledCount > 0 && (
            <button
              onClick={enableAll}
              disabled={saving}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50">
              Enable All
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Modules",    value: modules.length,                         color: "text-gray-900" },
          { label: "Enabled",          value: modules.filter(m => m.enabled).length,  color: "text-emerald-600" },
          { label: "Disabled",         value: disabledCount,                           color: "text-red-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center shadow-sm">
            <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Module groups */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ section, items }) => (
            <div key={section} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/70">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">{section}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(mod => (
                  <div key={mod.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {mod.enabled
                        ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      }
                      <div>
                        <p className={`text-sm font-semibold ${mod.enabled ? "text-gray-900" : "text-gray-400 line-through"}`}>
                          {mod.label}
                        </p>
                        <p className="text-[11px] text-gray-400">{mod.href}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      disabled={saving}
                      className="shrink-0 transition-opacity disabled:opacity-50"
                      aria-label={mod.enabled ? "Disable" : "Enable"}>
                      {mod.enabled
                        ? <ToggleRight className="h-8 w-8 text-indigo-600" />
                        : <ToggleLeft className="h-8 w-8 text-gray-300" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
