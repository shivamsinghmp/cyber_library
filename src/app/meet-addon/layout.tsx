import type { ReactNode } from "react";

export default function MeetAddonLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* Hide global Navbar and Footer inside Meet Add-on pages */
        nav[data-navbar], footer[data-footer] { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
