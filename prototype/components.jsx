// components.jsx — Boomerang shared UI: logo, icons, buttons, primitives
// All components exported to window at the bottom.

// ─────────────────────────────────────────────────────────────
// Logomark — boomerang glyph on a forest tile
// ─────────────────────────────────────────────────────────────
function Logo({ size = 40, tile = true, glyphColor }) {
  const g = glyphColor || '#34D399';
  const glyph = (
    <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24" fill="none">
      {/* boomerang: two curved arms meeting at top-right */}
      <path d="M4.5 19.5 C4.5 10.5 11 4.5 20 4.5" stroke={g} strokeWidth="3.2" strokeLinecap="round" fill="none"/>
      <path d="M20 4.5 C15.5 4.5 11.5 8.5 11.5 13.5 L11.5 19.5" stroke={g} strokeWidth="3.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
  if (!tile) return glyph;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: 'linear-gradient(155deg, #0F4A38, #0B3D2E)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 14px rgba(11,61,46,0.35)', flexShrink: 0,
    }}>{glyph}</div>
  );
}

function Wordmark({ size = 24, color = '#0B1F18' }) {
  return (
    <span style={{
      fontFamily: 'Manrope', fontWeight: 800, fontSize: size,
      letterSpacing: -0.8, color, lineHeight: 1,
    }}>Boomerang</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon set — single-path / simple stroke line icons
// ─────────────────────────────────────────────────────────────
const ICONS = {
  home:    'M3 10.5 12 3l9 7.5M5.5 9.2V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.2',
  box:     'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9ZM3.7 7.6 12 12m0 0 8.3-4.4M12 12v9',
  wallet:  'M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1H6a1.5 1.5 0 0 0 0 3h14v6a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Zm13.5 5.5h1.5',
  user:    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  search:  'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm6-2 4 4',
  chevR:   'M9 5l7 7-7 7',
  chevL:   'M15 5l-7 7 7 7',
  chevD:   'M5 9l7 7 7-7',
  check:   'M4 12.5 9.5 18 20 6.5',
  checkSm: 'M3.5 8.5 7 12l6.5-7',
  close:   'M5 5l14 14M19 5 5 19',
  pin:     'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2',
  chat:    'M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  star:    'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.1 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
  camera:  'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  plus:    'M12 5v14M5 12h14',
  bell:    'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm3.5 9a2.5 2.5 0 0 0 5 0',
  shield:  'M12 3 5 6v5.5c0 4.3 3 7.5 7 9 4-1.5 7-4.7 7-9V6l-7-3Zm-3 9 2 2 4-4.5',
  card:    'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18M6.5 15h4',
  car:     'M4 13.5 5.5 8A2 2 0 0 1 7.4 6.5h9.2A2 2 0 0 1 18.5 8L20 13.5m-16 0h16m-16 0v4.5h2.5v-2H17.5v2H20v-4.5M7 16.5h.01M17 16.5h.01',
  qr:      'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 4h2m4 0h-2m-4-4h2v2m4-2v6',
  store:   'M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5v0a2.5 2.5 0 0 0 4 1.8 2.5 2.5 0 0 0 4 0 2.5 2.5 0 0 0 4 0 2.5 2.5 0 0 0 4-1.8M5 11.5V20h14v-8.5M9.5 20v-5h5v5',
  arrowR:  'M5 12h14M13 6l6 6-6 6',
  arrowL:  'M19 12H5m6-6-6 6 6 6',
  arrowUp: 'M12 19V5m-6 6 6-6 6 6',
  refresh: 'M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20 8m0-5v5h-5M20.5 12a8.5 8.5 0 0 1-14.6 5.9L4 16m0 5v-5h5',
  tag:     'M3 11.5V4h7.5L21 14.5 14.5 21 3 11.5Zm4-3.5h.01',
  info:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v4m0-7.5h.01',
  doc:     'M6 3h8l4 4v14H6V3Zm8 0v4h4M9 12h6M9 16h6',
  truck:   'M2 6h11v9H2V6Zm11 3h4l3 3v3h-7V9Zm-7 9a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm10 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  phone:   'M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z',
  map:     'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
};

function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.8, fill = 'none', style }) {
  const d = ICONS[name] || '';
  const solid = name === 'star' && fill !== 'none';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={solid ? color : 'none'} style={style}>
      <path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={solid ? color : fill}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────
function Button({ children, onClick, variant = 'primary', size = 'lg', icon, iconRight, full = true, disabled, style }) {
  const [press, setPress] = React.useState(false);
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: full ? '100%' : 'auto',
    border: 'none', borderRadius: 16,
    fontFamily: 'Manrope', fontWeight: 700, letterSpacing: -0.2,
    height: size === 'lg' ? 56 : size === 'md' ? 48 : 40,
    fontSize: size === 'lg' ? 17 : size === 'md' ? 16 : 14,
    padding: size === 'sm' ? '0 16px' : '0 22px',
    transition: 'transform 0.12s ease, box-shadow 0.2s ease, opacity 0.2s',
    transform: press ? 'scale(0.972)' : 'scale(1)',
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...style,
  };
  const variants = {
    primary: { background: 'var(--btn-grad)', color: '#fff', boxShadow: '0 6px 18px rgba(11,122,75,0.32)' },
    forest:  { background: 'var(--forest)', color: '#fff', boxShadow: '0 6px 18px rgba(11,61,46,0.28)' },
    light:   { background: 'var(--mint-soft)', color: 'var(--forest)' },
    ghost:   { background: 'transparent', color: 'var(--forest)', boxShadow: 'inset 0 0 0 1.5px var(--line)' },
    dark:    { background: '#0B1F18', color: '#fff' },
  };
  return (
    <button
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      onTouchStart={() => setPress(true)}
      onTouchEnd={() => setPress(false)}
      onClick={onClick}
      style={{ ...base, ...variants[variant] }}
    >
      {icon && <Icon name={icon} size={20} color="currentColor" />}
      {children}
      {iconRight && <Icon name={iconRight} size={20} color="currentColor" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Card / surface
// ─────────────────────────────────────────────────────────────
function Card({ children, style, onClick, pad = 18, glow }) {
  const [press, setPress] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseDown={() => onClick && setPress(true)}
      onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)}
      onTouchStart={() => onClick && setPress(true)}
      onTouchEnd={() => setPress(false)}
      style={{
        background: 'var(--surface)', borderRadius: 'var(--r-md)',
        padding: pad, boxShadow: glow ? '0 8px 30px rgba(15,157,99,0.16)' : 'var(--shadow)',
        border: '1px solid var(--line-2)',
        transition: 'transform 0.14s ease',
        transform: press ? 'scale(0.985)' : 'scale(1)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >{children}</div>
  );
}

// brand logo chip used as a store / merchant avatar placeholder
function Merchant({ label, bg, fg = '#fff', size = 46, radius = 13 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: fg, fontFamily: 'Manrope', fontWeight: 800,
      fontSize: size * 0.42, letterSpacing: -0.5,
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
    }}>{label}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress dots for multi-step flow
// ─────────────────────────────────────────────────────────────
function StepBar({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 5, borderRadius: 3,
          flex: i === step ? 2.4 : 1,
          background: i <= step ? 'var(--emerald)' : 'var(--line)',
          transition: 'background 0.3s ease',
        }} />
      ))}
    </div>
  );
}

// flow header with back + step bar
function FlowHeader({ onBack, step, total, label }) {
  return (
    <div style={{ padding: '8px 20px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <button onClick={onBack} aria-label="Go back" style={{
          width: 44, height: 44, borderRadius: 12, border: '1px solid var(--line)',
          background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="arrowL" size={20} color="var(--ink)" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{step + 1}/{total}</div>
      </div>
      <StepBar step={step} total={total} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sticky bottom action bar
// ─────────────────────────────────────────────────────────────
function BottomBar({ children }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '14px 20px 30px',
      background: 'linear-gradient(180deg, rgba(244,246,245,0), var(--bg) 28%)',
      zIndex: 30,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar (home navigation)
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onTab, onReturn }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'returns', icon: 'box', label: 'Returns' },
    { id: '__cta' },
    { id: 'wallet', icon: 'wallet', label: 'Wallet' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      paddingBottom: 22, paddingTop: 10,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(18px) saturate(180%)',
      WebkitBackdropFilter: 'blur(18px) saturate(180%)',
      borderTop: '1px solid var(--line-2)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
    }}>
      {tabs.map(t => {
        if (t.id === '__cta') {
          return (
            <button key="cta" onClick={onReturn} aria-label="Start a return" style={{
              width: 58, height: 58, marginTop: -22, borderRadius: 20, border: 'none',
              background: 'var(--btn-grad)',
              boxShadow: '0 8px 20px rgba(11,122,75,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="plus" size={28} color="#fff" strokeWidth={2.4} />
            </button>
          );
        }
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            background: 'none', border: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, width: 64, padding: 0,
          }}>
            <Icon name={t.icon} size={24} color={on ? 'var(--forest)' : 'var(--muted-2)'} strokeWidth={on ? 2.1 : 1.8} />
            <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600, color: on ? 'var(--forest)' : 'var(--muted-2)' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status pill
// ─────────────────────────────────────────────────────────────
function StatusPill({ tone = 'mint', children, icon }) {
  const tones = {
    mint:   { bg: 'var(--mint-soft)', fg: 'var(--emerald)' },
    forest: { bg: 'rgba(11,61,46,0.08)', fg: 'var(--forest)' },
    amber:  { bg: 'rgba(232,163,61,0.14)', fg: '#B97714' },
    grey:   { bg: 'rgba(11,31,24,0.05)', fg: 'var(--muted)' },
  };
  const c = tones[tone] || tones.mint;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.fg, borderRadius: 999,
      padding: '5px 11px', fontSize: 12.5, fontWeight: 700, letterSpacing: -0.1,
    }}>
      {icon && <Icon name={icon} size={13} color={c.fg} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

Object.assign(window, {
  Logo, Wordmark, Icon, ICONS, Button, Card, Merchant,
  StepBar, FlowHeader, BottomBar, TabBar, StatusPill,
});
