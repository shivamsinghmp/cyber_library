export default function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A5F"/>
            <stop offset="100%" stopColor="#0F2040"/>
          </linearGradient>
        </defs>
        <polygon points="50,6 88,28 88,72 50,94 12,72 12,28"
          fill="url(#logo-bg)" stroke="#3B82F6" strokeWidth="2"/>
        <circle cx="50" cy="6"  r="2.5" fill="#F59E0B"/>
        <circle cx="88" cy="28" r="2.5" fill="#3B82F6"/>
        <circle cx="88" cy="72" r="2.5" fill="#06B6D4"/>
        <circle cx="50" cy="94" r="2.5" fill="#38BDF8"/>
        <circle cx="12" cy="72" r="2.5" fill="#06B6D4"/>
        <circle cx="12" cy="28" r="2.5" fill="#3B82F6"/>
        <path d="M50,26 L26,33 L26,68 L50,61 Z" fill="#3B82F6" opacity="0.9"/>
        <path d="M50,26 L74,33 L74,68 L50,61 Z" fill="#06B6D4" opacity="0.9"/>
        <line x1="50" y1="26" x2="50" y2="61" stroke="#E0F2FE" strokeWidth="1.5" opacity="0.7"/>
        <line x1="30" y1="44" x2="47" y2="41" stroke="#93C5FD" strokeWidth="1" opacity="0.6"/>
        <line x1="53" y1="41" x2="70" y2="44" stroke="#67E8F9" strokeWidth="1" opacity="0.6"/>
        <circle cx="50" cy="20" r="3" fill="#F59E0B"/>
        <line x1="50" y1="11" x2="50" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{
          fontSize: "11px",
          fontWeight: 600,
          background: "linear-gradient(90deg, #60A5FA, #38BDF8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "0.05em"
        }}>Let&apos;s</div>
        <div style={{
          fontSize: "16px",
          fontWeight: 800,
          background: "linear-gradient(90deg, #F59E0B, #FBBF24)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "0.02em"
        }}>STUDY</div>
      </div>
    </div>
  );
}
