"use client";

import { useEffect } from "react";

export function RecordLoginOnLoad() {
  useEffect(() => {
    fetch("/api/auth/record-login", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
