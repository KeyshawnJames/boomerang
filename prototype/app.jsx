// app.jsx — Tàpick root: navigation state machine + tweaks

const {
  IOSDevice, Logo, TabBar,
  HomeScreen, ReturnsScreen, WalletScreen, ProfileScreen,
  StoreScreen, DetailsScreen, EligibilityScreen, ScheduleScreen, ReviewScreen,
  QRScreen, MatchingScreen, TrackingScreen, DoneScreen,
  SEED_RETURNS, STORES,
  useTweaks, TweaksPanel, TweakSection, TweakColor, TweakSlider, TweakToggle,
} = window;

const FLOW = ['store', 'details', 'eligibility', 'schedule', 'review', 'qr', 'matching', 'tracking', 'done'];
const TABS = ['home', 'returns', 'wallet', 'profile'];

const AMOUNTS = [89.99, 129.00, 64.95, 152.40];
function newReturnId() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return 'TPK-' + s;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#0F9D63",
  "roundness": 20,
  "reduceMotion": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [view, setView] = React.useState('home');
  const [dir, setDir] = React.useState('push');
  const [flow, setFlow] = React.useState(null);
  const [driver, setDriver] = React.useState(null);
  const [active, setActive] = React.useState(null);
  const [history, setHistory] = React.useState(SEED_RETURNS);

  // apply tweaks to CSS vars (tints computed in JS — color-mix breaks some renderers)
  React.useEffect(() => {
    const r = document.documentElement;
    const a = t.accent;
    const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const mix = (h, p) => { const [r1, g1, b1] = hex2rgb(h); const m = (c) => Math.round(c * p + 255 * (1 - p)); return `rgb(${m(r1)}, ${m(g1)}, ${m(b1)})`; };
    r.style.setProperty('--emerald', a);
    r.style.setProperty('--mint', mix(a, 0.7));
    r.style.setProperty('--mint-soft', mix(a, 0.15));
    r.style.setProperty('--mint-tint', mix(a, 0.07));
    r.style.setProperty('--btn-grad', `linear-gradient(180deg, ${mix(a, 0.86)}, ${a})`);
    r.style.setProperty('--r-md', t.roundness + 'px');
    r.style.setProperty('--r-sm', Math.max(10, t.roundness - 6) + 'px');
  }, [t.accent, t.roundness]);

  React.useEffect(() => {
    document.body.classList.toggle('reduce-motion', !!t.reduceMotion);
  }, [t.reduceMotion]);

  const go = (next, direction = 'push') => { setDir(direction); setView(next); };

  // flow controls
  const startFlow = () => {
    setFlow({ amount: AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)], id: newReturnId(), item: 'Linen shirt — size S, blue', order: '' });
    go('store', 'push');
  };
  const set = (partial) => setFlow(f => ({ ...f, ...partial }));
  const flowNext = (arg) => {
    const i = FLOW.indexOf(view);
    const nxt = FLOW[i + 1];
    if (view === 'matching') setDriver(arg);
    if (nxt === 'tracking') {
      setActive({ ...flow, store: flow.store, item: flow.item, id: flow.id, driver: (arg && arg.name) ? arg.name.split(' ')[0] : 'Mathieu' });
    }
    go(nxt, 'push');
  };
  const flowBack = () => {
    const i = FLOW.indexOf(view);
    if (i <= 0) { go('home', 'pop'); setFlow(null); return; }
    go(FLOW[i - 1], 'pop');
  };
  const finishFlow = () => {
    // archive to history
    const rec = {
      id: flow.id, store: flow.store, item: flow.item, amount: flow.amount,
      status: 'refunded', date: 'Today', driver: (driver && driver.name) ? driver.name.split(' ')[0] : 'Mathieu',
    };
    setHistory(h => [rec, ...h]);
    setActive(null); setFlow(null); setDriver(null);
    go('home', 'pop');
  };
  const resume = () => go('tracking', 'push');

  const inFlow = FLOW.includes(view);
  const showTabs = TABS.includes(view);

  let screen = null;
  switch (view) {
    case 'home':    screen = <HomeScreen onStart={startFlow} active={active} onResume={resume} history={history} />; break;
    case 'returns': screen = <ReturnsScreen active={active} onResume={resume} history={history} />; break;
    case 'wallet':  screen = <WalletScreen history={history} />; break;
    case 'profile': screen = <ProfileScreen />; break;
    case 'store':   screen = <StoreScreen flow={flow} set={set} next={flowNext} back={flowBack} />; break;
    case 'details': screen = <DetailsScreen flow={flow} set={set} next={flowNext} back={flowBack} />; break;
    case 'eligibility': screen = <EligibilityScreen flow={flow} set={set} next={flowNext} back={flowBack} />; break;
    case 'schedule': screen = <ScheduleScreen flow={flow} set={set} next={flowNext} back={flowBack} />; break;
    case 'review':  screen = <ReviewScreen flow={flow} set={set} next={flowNext} back={flowBack} />; break;
    case 'qr':      screen = <QRScreen flow={flow} next={flowNext} back={flowBack} />; break;
    case 'matching': screen = <MatchingScreen flow={flow} next={flowNext} back={flowBack} />; break;
    case 'tracking': screen = <TrackingScreen flow={flow} driver={driver} onDone={() => go('done', 'push')} />; break;
    case 'done':    screen = <DoneScreen flow={flow} onHome={finishFlow} />; break;
    default: screen = <HomeScreen onStart={startFlow} active={active} onResume={resume} history={history} />;
  }

  const darkStatus = view === 'home' || view === 'qr' || view === 'tracking' || view === 'done';

  return (
    <div style={{ position: 'relative' }}>
      <IOSDevice dark={darkStatus}>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', overflow: 'hidden' }}>
          <div key={view} className={dir === 'push' ? 'screen-push' : 'screen-pop'} style={{ position: 'absolute', inset: 0 }}>
            {screen}
          </div>
          {showTabs && (
            <TabBar active={view} onReturn={startFlow} onTab={(id) => go(id, TABS.indexOf(id) > TABS.indexOf(view) ? 'push' : 'pop')} />
          )}
        </div>
      </IOSDevice>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Brand accent" />
        <TweakColor label="Accent color" value={t.accent}
          options={['#0F9D63', '#0E9488', '#2563EB', '#7C3AED']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Shape & motion" />
        <TweakSlider label="Card roundness" value={t.roundness} min={12} max={28} step={1} unit="px"
          onChange={(v) => setTweak('roundness', v)} />
        <TweakToggle label="Reduce motion" value={t.reduceMotion}
          onChange={(v) => setTweak('reduceMotion', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
