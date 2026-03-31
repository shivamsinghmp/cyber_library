"use client";

import { useEffect } from "react";
import { useMeetAddonStore } from "@/meet-addon/state/store";
import { subscribeMeetEvents } from "@/meet-addon/events/bus";

export default function MeetAddonMainStagePage() {
  const { activeQuizId, activePollId, focusMessage, onEvent } = useMeetAddonStore();

  useEffect(() => {
    const stop = subscribeMeetEvents(onEvent);
    return () => stop();
  }, [onEvent]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <h1 className="text-xl font-semibold">The Cyber Library Main Stage</h1>
      <p className="text-slate-400 mt-1">Mentor-led quizzes and room-wide prompts appear here.</p>

      <section className="mt-8 grid gap-4">
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm uppercase tracking-wide text-slate-400">Live Quiz</h2>
          <p className="mt-2 text-lg">{activeQuizId ? `Quiz ID: ${activeQuizId}` : "No live quiz right now."}</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm uppercase tracking-wide text-slate-400">Active Poll</h2>
          <p className="mt-2 text-lg">{activePollId ? `Poll ID: ${activePollId}` : "No active poll."}</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm uppercase tracking-wide text-slate-400">Focus Guard</h2>
          <p className="mt-2 text-lg">{focusMessage ?? "No focus alerts."}</p>
        </div>
      </section>
    </main>
  );
}
