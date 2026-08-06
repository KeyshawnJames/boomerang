// screens.jsx — Boomerang data, map, QR, and bottom-tab screens
// Exports to window at the bottom.

const { Logo, Wordmark, Icon, ICONS, Button, Card, Merchant, StatusPill, TabBar } = window;

// ─────────────────────────────────────────────────────────────
// Data — Montreal retailers + seed history (CAD)
// ─────────────────────────────────────────────────────────────
const STORES = [
{ id: 'simons', name: 'Simons', label: 'S', bg: '#1B2A4A', tag: 'Apparel', window: '30 days', addr: 'Carrefour Laval', dist: '4.2 km' },
{ id: 'aritzia', name: 'Aritzia', label: 'A', bg: '#111111', tag: 'Apparel', window: '14 days', addr: 'Sainte-Catherine O', dist: '2.1 km' },
{ id: 'bestbuy', name: 'Best Buy', label: 'BB', bg: '#1D4ED8', tag: 'Electronics', window: '15 days', addr: 'Marché Central', dist: '5.8 km' },
{ id: 'ssense', name: 'SSENSE', label: 'S', bg: '#0A0A0A', tag: 'Apparel', window: '30 days', addr: 'Saint-Sulpice', dist: '3.0 km' },
{ id: 'zara', name: 'Zara', label: 'Z', bg: '#1A1A1A', tag: 'Apparel', window: '30 days', addr: 'Eaton Centre', dist: '1.6 km' },
{ id: 'sephora', name: 'Sephora', label: 'SP', bg: '#161616', tag: 'Beauty', window: '30 days', addr: 'Sainte-Catherine O', dist: '1.9 km' },
{ id: 'mec', name: 'MEC', label: 'M', bg: '#0F6B3F', tag: 'Outdoor', window: '1 year', addr: 'Marché Central', dist: '5.5 km' },
{ id: 'cantire', name: 'Canadian Tire', label: 'CT', bg: '#C8102E', tag: 'Home', window: '90 days', addr: 'Saint-Laurent', dist: '6.3 km' },
{ id: 'apple', name: 'Apple', label: '', bg: '#1C1C1E', tag: 'Electronics', window: '14 days', addr: 'Sainte-Catherine O', dist: '2.0 km' },
{ id: 'lulu', name: 'lululemon', label: 'lu', bg: '#C2122E', tag: 'Athletic', window: '30 days', addr: 'Sainte-Catherine O', dist: '2.2 km' }];


const SEED_RETURNS = [
{ id: 'TPK-7Q42KD', store: STORES.find((s) => s.id === 'aritzia'), item: 'Wool blend coat — size M', amount: 168.00, status: 'refunded', date: 'May 21', driver: 'Mathieu' },
{ id: 'TPK-3F8X20', store: STORES.find((s) => s.id === 'bestbuy'), item: 'Sony WH-1000XM5 headphones', amount: 449.99, status: 'refunded', date: 'May 9', driver: 'Priya' }];


// reason chips
const REASONS = ['Wrong size', 'Changed my mind', 'Defective / damaged', 'Not as described', 'Wrong item sent', 'Arrived too late'];

// pickup time windows
const WINDOWS = [
{ id: 'asap', title: 'As soon as possible', sub: 'Driver in ~12 min', fee: 4.99, badge: 'Fastest' },
{ id: 'today', title: 'Today, 4:00 – 6:00 PM', sub: 'Afternoon window', fee: 2.99 },
{ id: 'eve', title: 'Today, 7:00 – 9:00 PM', sub: 'Evening window', fee: 2.99 },
{ id: 'tmrw', title: 'Tomorrow, 9:00 – 11:00 AM', sub: 'Morning window', fee: 1.99, badge: 'Cheapest' }];


// ─────────────────────────────────────────────────────────────
// QR code — deterministic pseudo-pattern
// ─────────────────────────────────────────────────────────────
function QRCode({ value = 'TPK', size = 188, fg = '#0B1F18' }) {
  const n = 21;
  const cells = React.useMemo(() => {
    // seeded PRNG from string
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = seed * 31 + value.charCodeAt(i) >>> 0;
    const rand = () => {seed = seed * 1664525 + 1013904223 >>> 0;return seed / 4294967296;};
    const grid = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) grid.push(rand() > 0.52);
    return grid;
  }, [value]);
  const c = size / n;
  const isFinder = (x, y) =>
  x < 7 && y < 7 || x >= n - 7 && y < 7 || x < 7 && y >= n - 7;

  const finder = (gx, gy) =>
  <g key={`f${gx}${gy}`}>
      <rect x={gx * c} y={gy * c} width={7 * c} height={7 * c} rx={2.5} fill={fg} />
      <rect x={(gx + 1) * c} y={(gy + 1) * c} width={5 * c} height={5 * c} rx={2} fill="#fff" />
      <rect x={(gx + 2) * c} y={(gy + 2) * c} width={3 * c} height={3 * c} rx={1.2} fill={fg} />
    </g>;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells.map((on, i) => {
        const x = i % n,y = Math.floor(i / n);
        if (isFinder(x, y) || !on) return null;
        return <rect key={i} x={x * c + 0.5} y={y * c + 0.5} width={c - 1} height={c - 1} rx={1} fill={fg} />;
      })}
      {finder(0, 0)}{finder(n - 7, 0)}{finder(0, n - 7)}
    </svg>);

}

// ─────────────────────────────────────────────────────────────
// Live map — abstract Montreal-style street grid + animated driver
// ─────────────────────────────────────────────────────────────
const ROUTE_D = 'M 120 527 C 120 470, 170 465, 170 415 C 170 365, 258 360, 258 310 C 258 265, 165 262, 165 212 C 165 162, 292 172, 300 128';

function MapView({ progress = 0, dark = true, height = 360 }) {
  const pathRef = React.useRef(null);
  const [pt, setPt] = React.useState({ x: 92, y: 612, a: 0 });

  React.useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const cur = p.getPointAtLength(len * progress);
    const ahead = p.getPointAtLength(Math.min(len, len * progress + 1));
    const a = Math.atan2(ahead.y - cur.y, ahead.x - cur.x) * 180 / Math.PI;
    setPt({ x: cur.x, y: cur.y, a });
  }, [progress]);

  const land = dark ? '#0E2A20' : '#EAF0EC';
  const block = dark ? '#123528' : '#E1EAE3';
  const road = dark ? '#0A1F18' : '#FBFCFB';
  const water = dark ? '#0C3A4A' : '#D6ECEF';

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      <svg viewBox="0 0 402 720" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block' }}>
        <rect x="0" y="0" width="402" height="720" fill={land} />
        {/* river diagonal */}
        <path d="M -40 700 L 220 700 L 440 380 L 440 520 L 300 700 Z" fill={water} opacity="0.5" />
        {/* blocks */}
        {[[20, 90, 120, 90], [160, 70, 90, 110], [270, 100, 110, 80], [30, 210, 100, 120], [150, 250, 120, 80], [290, 210, 90, 150],
        [20, 360, 110, 130], [160, 360, 80, 120], [270, 390, 120, 110], [40, 520, 120, 110], [180, 510, 110, 130], [310, 520, 90, 120]].
        map((b, i) =>
        <rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx="10" fill={block} opacity="0.9" />
        )}
        {/* roads */}
        {[150, 300, 460].map((x, i) => <rect key={'v' + i} x={x} y="-20" width="14" height="760" fill={road} opacity="0.85" />)}
        {[200, 340, 490].map((y, i) => <rect key={'h' + i} x="-20" y={y} width="442" height="14" fill={road} opacity="0.85" />)}

        {/* route — done + remaining */}
        <path ref={pathRef} d={ROUTE_D} fill="none" stroke="transparent" strokeWidth="1" />
        <path d={ROUTE_D} fill="none" stroke={dark ? 'rgba(255,255,255,0.14)' : 'rgba(11,61,46,0.14)'} strokeWidth="7" strokeLinecap="round" />
        <path d={ROUTE_D} fill="none" stroke="#34D399" strokeWidth="7" strokeLinecap="round"
        strokeDasharray="1000" strokeDashoffset={1000 - 1000 * progress}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />

        {/* destination (store) */}
        <g transform="translate(300 128)">
          <circle r="15" fill="#0B3D2E" stroke="#fff" strokeWidth="3" />
          <path d="M -6 0 L 8 0 M 1 -7 L 8 0 L 1 7" stroke="#34D399" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1 0)" />
        </g>
        {/* origin (home) */}
        <g transform="translate(120 527)">
          <circle r="9" fill="#fff" stroke="#34D399" strokeWidth="4" />
        </g>

        {/* driver — lives inside the SVG so it tracks the route exactly */}
        <g style={{ transform: `translate(${pt.x}px, ${pt.y}px)`, transition: 'transform 1.2s cubic-bezier(0.4,0,0.2,1)' }}>
          <circle className="tp-map-ring" r="17" fill="rgba(52,211,153,0.32)" />
          <circle r="17" fill="#0B7A4B" stroke="#fff" strokeWidth="3.5" />
          <g transform="translate(-9 -9) scale(0.75)">
            <path d={ICONS.car} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Home tab
// ─────────────────────────────────────────────────────────────
function HomeScreen({ onStart, active, onResume, history }) {
  return (
    <div className="tp-scroll" style={{ height: '100%', overflowY: 'auto', paddingBottom: 110 }}>
      {/* forest header */}
      <div style={{
        background: 'linear-gradient(165deg, #0F4A38, #0B3D2E)', padding: '64px 22px 92px',
        borderBottomLeftRadius: 34, borderBottomRightRadius: 34, color: '#fff', position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={36} />
            <Wordmark size={22} color="#fff" />
          </div>
          <button aria-label="Notifications" style={{ position: 'relative', width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Icon name="bell" size={21} color="#fff" />
            <div style={{ position: 'absolute', top: 9, right: 11, width: 8, height: 8, borderRadius: 4, background: '#34D399', border: '2px solid #0F4A38' }} />
          </button>
        </div>
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Hey, Camile</div>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.6, marginTop: 3, lineHeight: 1.15 }}>Got something to send back?</div>
        </div>
      </div>

      {/* CTA card lifts over header */}
      <div style={{ padding: '0 18px', marginTop: -64, position: 'relative', zIndex: 2 }}>
        <Card glow pad={20} style={{ borderRadius: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 15, background: 'var(--mint-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="box" size={25} color="var(--emerald)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Start a return</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 500 }}>We pick it up. We bring it back.</div>
            </div>
          </div>
          <Button onClick={onStart} iconRight="arrowR">Schedule a pickup</Button>
        </Card>
      </div>

      {/* active return resume */}
      {active &&
      <div style={{ padding: '16px 18px 0' }}>
          <Card onClick={onResume} pad={16} style={{ borderRadius: 22, background: 'linear-gradient(160deg,#0F4A38,#0B3D2E)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="car" size={23} color="#34D399" />
                <div style={{ position: 'absolute', inset: 0, borderRadius: 14, border: '2px solid rgba(52,211,153,0.4)', animation: 'tp-pulse-ring 2s ease-out 3' }} />
              </div>
              <div style={{ flex: 1, color: '#fff' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', letterSpacing: 0.3 }}>PICKUP IN PROGRESS</div>
                <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 1 }}>{active.driver} is on the way</div>
              </div>
              <Icon name="chevR" size={20} color="rgba(255,255,255,0.6)" />
            </div>
          </Card>
        </div>
      }

      {/* how it works */}
      <div style={{ padding: '24px 22px 6px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>How Boomerang works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
          { i: 'store', t: 'Pick the store', s: 'Choose where you bought it' },
          { i: 'qr', t: 'Get your QR code', s: 'Your return authorization' },
          { i: 'car', t: 'A driver picks it up', s: 'From your door, on your schedule' },
          { i: 'wallet', t: 'Get refunded', s: 'Tracked end-to-end to the store' }].
          map((s, i, arr) =>
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={s.i} size={19} color="var(--forest)" />
                </div>
                {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 14, background: 'var(--line)', margin: '4px 0' }} />}
              </div>
              <div style={{ paddingBottom: 14, paddingTop: 7 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{s.s}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* recent */}
      {history.length > 0 &&
      <div style={{ padding: '8px 18px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 10px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted-2)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Recent returns</div>
          </div>
          <Card pad={8} style={{ borderRadius: 22 }}>
            {history.slice(0, 2).map((r, i) =>
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 10px', borderBottom: i === 0 ? '1px solid var(--line-2)' : 'none' }}>
                <Merchant label={r.store.label} bg={r.store.bg} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.store.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.item}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>${r.amount.toFixed(2)}</div>
                  <StatusPill tone="mint" icon="checkSm">Refunded</StatusPill>
                </div>
              </div>
          )}
          </Card>
        </div>
      }
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Returns tab
// ─────────────────────────────────────────────────────────────
function ReturnsScreen({ active, onResume, history }) {
  return (
    <div className="tp-scroll" style={{ height: '100%', overflowY: 'auto', paddingBottom: 110, paddingTop: 60 }}>
      <div style={{ padding: '8px 22px 16px' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }}>Returns</div>
      </div>
      {active &&
      <div style={{ padding: '0 18px 18px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--emerald)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Active</div>
          <Card onClick={onResume} pad={16} glow style={{ borderRadius: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Merchant label={active.store.label} bg={active.store.bg} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{active.store.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.item}</div>
                <div style={{ marginTop: 7 }}><StatusPill tone="forest" icon="car">{active.driver} en route</StatusPill></div>
              </div>
              <Icon name="chevR" size={20} color="var(--muted-2)" />
            </div>
          </Card>
        </div>
      }
      <div style={{ padding: '0 18px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted-2)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Completed</div>
        <Card pad={8} style={{ borderRadius: 22 }}>
          {history.map((r, i) =>
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 10px', borderBottom: i < history.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
              <Merchant label={r.store.label} bg={r.store.bg} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.store.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{r.date} · {r.id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>${r.amount.toFixed(2)}</div>
                <StatusPill tone="mint" icon="checkSm">Refunded</StatusPill>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Wallet tab
// ─────────────────────────────────────────────────────────────
function WalletScreen({ history }) {
  const total = history.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="tp-scroll" style={{ height: '100%', overflowY: 'auto', paddingBottom: 110, paddingTop: 60 }}>
      <div style={{ padding: '8px 22px 16px' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }}>Wallet</div>
      </div>
      <div style={{ padding: '0 18px' }}>
        <div style={{
          background: 'linear-gradient(150deg, #0F4A38, #0B2A20)', borderRadius: 24, padding: 22, color: '#fff',
          boxShadow: '0 12px 30px rgba(11,61,46,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Refunded this year</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, marginTop: 4, fontFamily: 'Manrope' }}>${total.toFixed(2)} <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>CAD</span></div>
            </div>
            <Logo size={36} />
          </div>
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="card" size={20} color="#34D399" />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, letterSpacing: 1, color: 'rgba(255,255,255,0.85)' }}>•••• •••• •••• 4921</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '22px 18px 0' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted-2)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Refund history</div>
        <Card pad={8} style={{ borderRadius: 22 }}>
          {history.map((r, i) =>
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 10px', borderBottom: i < history.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--mint-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrowUp" size={19} color="var(--emerald)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.store.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{r.date} · Refund to •••• 4921</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--emerald)' }}>+${r.amount.toFixed(2)}</div>
            </div>
          )}
        </Card>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// Profile tab
// ─────────────────────────────────────────────────────────────
function ProfileScreen() {
  const rows = [
  { i: 'pin', t: 'Addresses', s: '4849 Av. Papineau, Montréal' },
  { i: 'card', t: 'Payment methods', s: 'Visa •••• 4921' },
  { i: 'shield', t: 'Privacy & security' },
  { i: 'chat', t: 'Help & support' },
  { i: 'info', t: 'About Boomerang' }];

  return (
    <div className="tp-scroll" style={{ height: '100%', overflowY: 'auto', paddingBottom: 110, paddingTop: 60 }}>
      <div style={{ padding: '8px 22px 20px' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }}>Profile</div>
      </div>
      <div style={{ padding: '0 18px' }}>
        <Card pad={18} style={{ borderRadius: 22, display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(150deg,#34D399,#0F9D63)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24 }}>C</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800 }}>Camille Tremblay</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 500 }}>camille.t@email.com</div>
          </div>
          <StatusPill tone="mint" icon="sparkle">Plus</StatusPill>
        </Card>
      </div>
      <div style={{ padding: '16px 18px 0' }}>
        <Card pad={6} style={{ borderRadius: 22 }}>
          {rows.map((r, i) =>
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', borderBottom: i < rows.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--mint-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={r.i} size={19} color="var(--forest)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{r.t}</div>
                {r.s && <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{r.s}</div>}
              </div>
              <Icon name="chevR" size={18} color="var(--muted-2)" />
            </div>
          )}
        </Card>
      </div>
    </div>);

}

Object.assign(window, {
  STORES, SEED_RETURNS, REASONS, WINDOWS,
  QRCode, MapView, HomeScreen, ReturnsScreen, WalletScreen, ProfileScreen
});