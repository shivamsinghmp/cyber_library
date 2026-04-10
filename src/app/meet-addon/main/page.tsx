"use client";

import { useEffect, useRef } from "react";
import { useMeetAddonStore } from "@/meet-addon/state/store";
import { subscribeMeetEvents } from "@/meet-addon/events/bus";
import { MonitorPlay } from "lucide-react";

export default function MeetAddonMainStagePage() {
  const { activeQuizId, activePollId, focusMessage, onEvent } = useMeetAddonStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPiPMonitor = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        mediaStream.getVideoTracks()[0].onended = () => {
           if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(console.error);
           }
        };

        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP Screen capture failed:", err);
      alert("Floating Monitor requires screen share permissions.");
    }
  };

  useEffect(() => {
    const stop = subscribeMeetEvents(onEvent);
    return () => stop();
  }, [onEvent]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <h1 className="text-xl font-semibold">The Cyber Library Main Stage</h1>
      <p className="text-slate-400 mt-1">Mentor-led quizzes and room-wide prompts appear here.</p>

      <div className="mt-6 relative">
        <video ref={videoRef} playsInline muted className="w-0 h-0 opacity-0 absolute pointer-events-none" />
        <button 
          onClick={startPiPMonitor}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all font-semibold uppercase tracking-wide text-sm shadow-lg"
        >
          <MonitorPlay className="w-5 h-5" /> Start Floating Lecture Monitor
        </button>
      </div>

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
