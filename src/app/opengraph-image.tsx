import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Let's Study — Live 24/7 Focus Hub & Study Rooms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "60px 72px",
          background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: 200,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99,102,241,0.25)",
            border: "1px solid rgba(99,102,241,0.5)",
            borderRadius: 100,
            padding: "8px 20px",
            marginBottom: 24,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
          <span style={{ color: "#a5b4fc", fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>
            Live 24/7 · 1000+ Students Studying
          </span>
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: -1,
          }}
        >
          {"Finally, a Place Where"}
          <br />
          <span style={{ color: "#818cf8" }}>{"You Actually Study."}</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 26,
            color: "#94a3b8",
            marginBottom: 40,
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Virtual study rooms, Pomodoro sessions & accountability — for UPSC, JEE, NEET & Professionals.
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: 26, fontWeight: 800 }}>L</span>
          </div>
          <span style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700 }}>cyberlib.in</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
