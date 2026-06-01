"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PlanLockedScreen } from "../panel/components/PlanLockedScreen";

function LockedContent() {
  const params = useSearchParams();
  const state = params.get("reason") ?? "no_plan";
  return <PlanLockedScreen state={state} />;
}

export default function MeetAddonLockedPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" style={{ background: "var(--page-bg)" }} />}>
      <LockedContent />
    </Suspense>
  );
}
