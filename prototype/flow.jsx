// flow.jsx — Tàpick return flow screens (store → details → eligibility → schedule → review → QR → matching → tracking → done)

const { Logo, Wordmark, Icon, Button, Card, Choice, Merchant, StatusPill, FlowHeader, BottomBar, QRCode, MapView, STORES, REASONS, WINDOWS, ELIGIBILITY_QUESTIONS, fillWindow, eligibilityOutcome } = window;

// small square check for the attestation / acknowledgement rows
function CheckBox({ on, tone = 'emerald' }) {
  return (
    <div style={{
      width: 21, height: 21, borderRadius: 6, flexShrink: 0, marginTop: 1,
      border: `2px solid ${on ? `var(--${tone})` : 'var(--line)'}`,
      background: on ? `var(--${tone})` : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.18s ease',
    }}>
      {on && <Icon name="checkSm" size={12} color="#fff" strokeWidth={3} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1 · Select store
// ─────────────────────────────────────────────────────────────
function StoreScreen({ flow, set, next, back }) {
  const [q, setQ] = React.useState('');
  const list = STORES.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 54, background: 'var(--bg)' }}>
      <FlowHeader onBack={back} step={0} total={5} label="Choose retailer" />
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.6, marginBottom: 14 }}>Where did you buy it?</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: '0 14px', height: 50 }}>
          <Icon name="search" size={20} color="var(--muted-2)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search stores in Montréal"
                 style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15.5, fontWeight: 500, background: 'transparent', color: 'var(--ink)' }} />
        </div>
      </div>
      <div className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 120px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }} className="stagger">
          {list.map((s, i) => (
            <Card key={s.id} pad={13} onClick={() => { set({ store: s }); next(); }}
                  style={{ borderRadius: 18, display: 'flex', alignItems: 'center', gap: 13, animationDelay: `${Math.min(i * 0.035, 0.18)}s` }}>
              <Merchant label={s.label} bg={s.bg} size={46} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{s.tag} · {s.dist} away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted-2)', fontWeight: 600 }}>Returns</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)' }}>{s.window}</div>
              </div>
            </Card>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontWeight: 500 }}>No stores match "{q}"</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2 · Return details
// ─────────────────────────────────────────────────────────────
function DetailsScreen({ flow, set, next, back }) {
  const [item, setItem] = React.useState(flow.item || '');
  const [order, setOrder] = React.useState(flow.order || '');
  const [reason, setReason] = React.useState(flow.reason || '');
  const [photo, setPhoto] = React.useState(flow.photo || false);
  const ready = item && reason;

  const Field = ({ label, htmlFor, children }) => (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 7, paddingLeft: 2 }}>{label}</label>
      {children}
    </div>
  );
  const inputStyle = { width: '100%', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 15px', fontSize: 15, fontWeight: 600, background: 'var(--surface)', outline: 'none', color: 'var(--ink)' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 54, background: 'var(--bg)' }}>
      <FlowHeader onBack={back} step={1} total={5} label="Item details" />
      <div className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 130px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18, padding: '10px 12px', background: 'var(--mint-tint)', borderRadius: 14 }}>
          <Merchant label={flow.store.label} bg={flow.store.bg} size={36} radius={10} />
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>Returning to {flow.store.name}</div>
        </div>

        <Field label="What are you returning?" htmlFor="item-input">
          <input id="item-input" value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Linen shirt — size S, blue" style={inputStyle} />
        </Field>
        <Field label="Order number (optional)" htmlFor="order-input">
          <input id="order-input" value={order} onChange={e => setOrder(e.target.value)} placeholder="From your receipt or email" style={{ ...inputStyle, fontFamily: 'IBM Plex Mono', fontSize: 14 }} />
        </Field>
        <Field label="Reason for return">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REASONS.map(r => {
              const on = reason === r;
              return (
                <button key={r} onClick={() => setReason(r)} style={{
                  border: on ? '1.5px solid var(--emerald)' : '1.5px solid var(--line)',
                  background: on ? 'var(--mint-soft)' : 'var(--surface)',
                  color: on ? 'var(--forest)' : 'var(--ink)',
                  borderRadius: 999, padding: '9px 14px', fontSize: 13.5, fontWeight: 700,
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {on && <Icon name="checkSm" size={13} color="var(--emerald)" strokeWidth={2.6} />}
                  {r}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Add a photo (optional)">
          <button onClick={() => setPhoto(!photo)} style={{
            width: '100%', height: photo ? 120 : 64, border: `1.5px dashed ${photo ? 'var(--emerald)' : 'var(--line)'}`,
            borderRadius: 16, background: photo ? 'var(--mint-tint)' : 'var(--surface)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
            color: photo ? 'var(--emerald)' : 'var(--muted-2)', transition: 'all 0.2s',
          }}>
            <Icon name={photo ? 'check' : 'camera'} size={photo ? 28 : 22} color={photo ? 'var(--emerald)' : 'var(--muted-2)'} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{photo ? 'Tap to remove photo' : 'Tap to add a photo of the item'}</span>
          </button>
        </Field>
      </div>
      <BottomBar>
        <Button disabled={!ready} iconRight="arrowR" onClick={() => { set({ item, order, reason, photo }); next(); }}>Continue</Button>
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3 · Eligibility & policy
// ─────────────────────────────────────────────────────────────
function EligibilityScreen({ flow, set, next, back }) {
  const prev = flow.eligibility || {};
  const [answers, setAnswers] = React.useState(prev.answers || {});
  const [attested, setAttested] = React.useState(false);
  const [ack, setAck] = React.useState(false);
  const scroller = React.useRef(null);

  const store = flow.store;
  const fill = (t) => fillWindow(t, store);
  const { outcome, blocks, warns, answered } = eligibilityOutcome(ELIGIBILITY_QUESTIONS, answers);
  const blocked = outcome === 'ineligible';

  // an answer that disqualifies the return invalidates any prior sign-off
  const pick = (code, value) => {
    setAnswers(a => ({ ...a, [code]: value }));
    setAck(false); setAttested(false);
  };

  // "Change my answers" — clear only what disqualified it, jump back to the top
  const clearBlocking = () => {
    setAnswers(a => {
      const nextA = { ...a };
      blocks.forEach(b => delete nextA[b.q.code]);
      return nextA;
    });
    if (scroller.current) scroller.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canContinue = answered && !blocked && attested && (!warns.length || ack);

  const tone = blocked ? 'danger' : warns.length ? 'amber' : 'emerald';
  const tint = (pct) => `color-mix(in srgb, var(--${tone}) ${pct}%, transparent)`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 54, background: 'var(--bg)' }}>
      <FlowHeader onBack={back} step={2} total={5} label="Eligibility" />
      <div ref={scroller} className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 150px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--mint-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="shield" size={20} color="var(--emerald)" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.6 }}>A few quick checks</div>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 500, marginBottom: 18, lineHeight: 1.45 }}>
          {store.name} accepts returns within {store.window}. Answer honestly — if the
          store refuses the item because something here was wrong, the pickup fee isn't
          refunded.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ELIGIBILITY_QUESTIONS.map((q, qi) => {
            const chosen = answers[q.code];
            const opt = q.options.find(o => o.value === chosen);
            const bad = opt && opt.outcome !== 'pass';
            return (
              <Card key={q.code} pad={0} style={{
                borderRadius: 20, overflow: 'hidden',
                border: bad ? `1.5px solid var(--${opt.outcome === 'block' ? 'danger' : 'amber'})` : '1px solid var(--line-2)',
              }}>
                <div style={{ padding: '14px 15px 10px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted-2)', fontFamily: 'IBM Plex Mono' }}>{qi + 1}</span>
                    <span style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: -0.3 }}>{fill(q.prompt)}</span>
                  </div>
                  {q.help && <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginTop: 3, paddingLeft: 18 }}>{fill(q.help)}</div>}
                </div>
                {q.options.map((o, i) => (
                  <Choice
                    key={o.value}
                    label={fill(o.label)}
                    selected={chosen === o.value}
                    last={i === q.options.length - 1}
                    tone={o.outcome === 'block' ? 'danger' : o.outcome === 'warn' ? 'amber' : 'emerald'}
                    onClick={() => pick(q.code, o.value)}
                  />
                ))}
              </Card>
            );
          })}
        </div>

        {/* verdict — only once every question has an answer */}
        {answered && (
          <div style={{ marginTop: 18, borderRadius: 20, padding: 16, animation: 'tp-fade-up 0.3s ease',
            background: tint(9), border: `1.5px solid ${tint(45)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: blocked || warns.length ? 10 : 0 }}>
              <Icon name={blocked ? 'ban' : warns.length ? 'alert' : 'shield'} size={22} color={`var(--${tone})`} strokeWidth={2} />
              <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: -0.3, color: `var(--${tone})` }}>
                {blocked ? 'We can’t take this return' : warns.length ? 'We can try, but no guarantee' : 'Looks eligible'}
              </div>
            </div>

            {(blocked ? blocks : warns).map(({ q, opt }) => (
              <div key={q.code} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 7 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: `var(--${tone})`, marginTop: 7, flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.45 }}>{fill(opt.why)}</div>
              </div>
            ))}

            {blocked && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tint(30)}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>Returning it yourself</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, lineHeight: 1.5 }}>
                  Bring the item to {store.name} at {store.addr} with your proof of purchase.
                  Staff can sometimes make an exception in person — we can’t make that call
                  for them, and we won’t charge you for a trip that’s going to be refused.
                </div>
              </div>
            )}

            {!blocked && !!warns.length && (
              <div onClick={() => setAck(v => !v)} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tint(30)}`, cursor: 'pointer' }}>
                <CheckBox on={ack} tone="amber" />
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
                  I understand {store.name} may still refuse this return, and the pickup fee
                  is charged either way.
                </div>
              </div>
            )}
          </div>
        )}

        {/* attestation */}
        {answered && !blocked && (
          <Card pad={15} onClick={() => setAttested(v => !v)} style={{ borderRadius: 20, marginTop: 12, display: 'flex', gap: 11, alignItems: 'flex-start', border: attested ? '1.5px solid var(--emerald)' : '1px solid var(--line-2)' }}>
            <CheckBox on={attested} />
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
              I confirm these answers are accurate. If {store.name} refuses this return
              because the information above is wrong, the pickup fee is non-refundable.
            </div>
          </Card>
        )}
      </div>

      <BottomBar>
        {blocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button variant="light" icon="refresh" onClick={clearBlocking}>Change my answers</Button>
            <Button variant="ghost" size="md" onClick={back}>Cancel this return</Button>
          </div>
        ) : (
          <Button disabled={!canContinue} iconRight="arrowR" onClick={() => {
            set({ eligibility: { answers, outcome, attestedAt: new Date().toISOString() } });
            next();
          }}>
            {!answered ? `${Object.keys(answers).length} of ${ELIGIBILITY_QUESTIONS.length} answered` : 'Confirm & continue'}
          </Button>
        )}
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4 · Schedule pickup
// ─────────────────────────────────────────────────────────────
function ScheduleScreen({ flow, set, next, back }) {
  const [win, setWin] = React.useState(flow.window || 'asap');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 54, background: 'var(--bg)' }}>
      <FlowHeader onBack={back} step={3} total={5} label="Schedule pickup" />
      <div className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 130px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, paddingLeft: 2 }}>Pickup address</div>
        <Card pad={15} style={{ borderRadius: 18, display: 'flex', alignItems: 'center', gap: 13, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--mint-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pin" size={21} color="var(--emerald)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Home</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>4849 Av. Papineau, Montréal, QC</div>
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--muted-2)' }}>Change</span>
        </Card>

        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, paddingLeft: 2 }}>When should we come?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WINDOWS.map(w => {
            const on = win === w.id;
            return (
              <Card key={w.id} pad={15} onClick={() => setWin(w.id)} style={{
                borderRadius: 18, border: on ? '1.5px solid var(--emerald)' : '1px solid var(--line-2)',
                display: 'flex', alignItems: 'center', gap: 13, boxShadow: on ? '0 6px 20px rgba(15,157,99,0.14)' : 'var(--shadow)',
              }}>
                <div style={{ width: 21, height: 21, borderRadius: '50%', flexShrink: 0, transition: 'all 0.18s ease',
                  border: `2px solid ${on ? 'var(--emerald)' : 'var(--line)'}`, background: on ? 'var(--emerald)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Icon name="checkSm" size={12} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{w.title}</span>
                    {w.badge && <StatusPill tone={w.badge === 'Fastest' ? 'mint' : 'amber'}>{w.badge}</StatusPill>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginTop: 1 }}>{w.sub}</div>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>${w.fee.toFixed(2)}</div>
              </Card>
            );
          })}
        </div>
      </div>
      <BottomBar>
        <Button iconRight="arrowR" onClick={() => { set({ window: win }); next(); }}>Review return</Button>
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5 · Review & confirm
// ─────────────────────────────────────────────────────────────
function ReviewScreen({ flow, set, next, back }) {
  const w = WINDOWS.find(x => x.id === flow.window) || WINDOWS[0];
  const warned = flow.eligibility && flow.eligibility.outcome === 'eligible_with_warnings';
  const Row = ({ label, value, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '13px 0', borderBottom: '1px solid var(--line-2)', gap: 16 }}>
      <span style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', fontFamily: mono ? 'IBM Plex Mono' : 'Manrope' }}>{value}</span>
    </div>
  );
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 54, background: 'var(--bg)' }}>
      <FlowHeader onBack={back} step={4} total={5} label="Review" />
      <div className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 150px' }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.6, marginBottom: 16 }}>Confirm your return</div>

        <Card pad={18} style={{ borderRadius: 22, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, paddingBottom: 14, borderBottom: '1px solid var(--line-2)' }}>
            <Merchant label={flow.store.label} bg={flow.store.bg} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{flow.store.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{flow.item}</div>
            </div>
          </div>
          <Row label="Reason" value={flow.reason} />
          <Row label="Eligibility" value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: warned ? 'var(--amber)' : 'var(--emerald)' }}>
              <Icon name={warned ? 'alert' : 'shield'} size={14} color="currentColor" strokeWidth={2.2} />
              {warned ? 'Confirmed — with warnings' : 'Confirmed by you'}
            </span>
          } />
          <Row label="Pickup from" value="4849 Av. Papineau" />
          <Row label="Pickup time" value={w.title} />
          <Row label="Refund to" value="Visa •••• 4921" mono />
        </Card>

        <Card pad={18} style={{ borderRadius: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 12px', borderBottom: '1px solid var(--line-2)' }}>
            <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>Pickup fee</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>${w.fee.toFixed(2)} CAD</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Estimated refund</div>
              <div style={{ fontSize: 12, color: 'var(--muted-2)', fontWeight: 500 }}>Per {flow.store.name}'s policy</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald)' }}>${flow.amount.toFixed(2)}</span>
          </div>
        </Card>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16, color: 'var(--muted-2)' }}>
          <Icon name="shield" size={15} color="var(--muted-2)" />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Insured up to $500 in transit</span>
        </div>
      </div>
      <BottomBar>
        <Button iconRight="qr" onClick={next}>Confirm & generate QR</Button>
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6 · QR authorization
// ─────────────────────────────────────────────────────────────
function QRScreen({ flow, next, back }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0F4A38, #0B2A20)', paddingTop: 60 }}>
      <div style={{ padding: '0 20px 4px' }}>
        <button onClick={back} aria-label="Go back" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="arrowL" size={20} color="#fff" />
        </button>
      </div>
      <div className="tp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 130px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <StatusPill tone="mint" icon="check">Return authorized</StatusPill>
        <div style={{ color: '#fff', fontSize: 23, fontWeight: 800, letterSpacing: -0.5, marginTop: 16, textAlign: 'center' }}>Your return QR code</div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500, marginTop: 6, textAlign: 'center', maxWidth: 270 }}>
          Your driver scans this at pickup to confirm the handoff.
        </div>

        <div style={{ background: '#fff', borderRadius: 28, padding: 26, marginTop: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', animation: 'tp-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center', marginBottom: 16 }}>
            <Logo size={26} />
            <Wordmark size={17} />
          </div>
          <QRCode value={flow.id} size={196} />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Return ID</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>{flow.id}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 22, marginTop: 24 }}>
          {[['store', flow.store.name], ['box', '1 item'], ['shield', 'Insured']].map((x, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Icon name={x[0]} size={20} color="#34D399" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{x[1]}</span>
            </div>
          ))}
        </div>
      </div>
      <BottomBar>
        <div style={{ background: 'transparent' }}>
          <Button variant="light" iconRight="arrowR" onClick={next}>Find me a driver</Button>
        </div>
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7 · Driver matching
// ─────────────────────────────────────────────────────────────
function MatchingScreen({ flow, next, back }) {
  const [found, setFound] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setFound(true), 2600); return () => clearTimeout(t); }, []);
  const driver = { name: 'Mathieu L.', rating: 4.96, trips: 1240, car: 'Toyota RAV4 · Grey', plate: 'L29 8KW', eta: 12 };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', paddingTop: 60 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px 110px' }}>
        {!found ? (
          <>
            <div style={{ position: 'relative', width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[0, 0.6, 1.2].map((d, i) => (
                <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(52,211,153,0.18)', animation: `tp-pulse-ring 2.2s ease-out ${d}s infinite` }} />
              ))}
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(180deg,#12A66A,#0B7A4B)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(11,122,75,0.35)' }}>
                <Icon name="car" size={38} color="#fff" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginTop: 30 }}>Finding your driver…</div>
            <div style={{ fontSize: 14.5, color: 'var(--muted)', fontWeight: 500, marginTop: 6, textAlign: 'center' }}>Matching the closest available driver near 4849 Av. Papineau</div>
          </>
        ) : (
          <div style={{ width: '100%', animation: 'tp-fade-up 0.5s cubic-bezier(0.22,0.61,0.36,1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <StatusPill tone="mint" icon="check">Driver matched</StatusPill>
            </div>
            <Card pad={20} glow style={{ borderRadius: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(150deg,#1B2A4A,#0B3D2E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>M</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{driver.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Icon name="star" size={14} color="#E8A33D" fill="#E8A33D" />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{driver.rating}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted-2)', fontWeight: 500 }}>· {driver.trips.toLocaleString()} pickups</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <div style={{ flex: 1, background: 'var(--mint-tint)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>Vehicle</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{driver.car}</div>
                </div>
                <div style={{ background: 'var(--mint-tint)', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>Plate</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, fontFamily: 'IBM Plex Mono' }}>{driver.plate}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, justifyContent: 'center', color: 'var(--forest)' }}>
                <Icon name="clock" size={17} color="var(--forest)" />
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>Arriving in ~{driver.eta} min</span>
              </div>
            </Card>
          </div>
        )}
      </div>
      <BottomBar>
        {found
          ? <Button iconRight="map" onClick={() => next(driver)}>Track pickup</Button>
          : <Button variant="ghost" onClick={back}>Cancel search</Button>
        }
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8 · Live tracking
// ─────────────────────────────────────────────────────────────
const TRACK_STEPS = [
  { t: 'Driver is on the way to you', s: 'Heading to 4849 Av. Papineau', p: 0.0 },
  { t: 'Driver has arrived', s: 'Meet at your door', p: 0.0 },
  { t: 'Item picked up', s: 'QR code scanned · handoff confirmed', p: 0.0 },
  { t: 'On the way to the store', s: '', p: 0.62 },
  { t: 'Returned to the store', s: 'Drop-off complete', p: 1.0 },
];

function TrackingScreen({ flow, driver, onDone }) {
  const [phase, setPhase] = React.useState(0);
  const done = phase >= TRACK_STEPS.length - 1;

  React.useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setPhase(p => p + 1), 2700);
    return () => clearTimeout(t);
  }, [phase, done]);

  const cur = TRACK_STEPS[Math.min(phase, TRACK_STEPS.length - 1)];
  const scanning = phase === 2;

  return (
    <div style={{ height: '100%', position: 'relative', background: '#0B2A20', overflow: 'hidden' }}>
      {/* map fills top */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapView progress={cur.p} dark height={'100%'} />
      </div>
      {/* top status chip */}
      <div style={{ position: 'absolute', top: 60, left: 18, right: 18, zIndex: 10 }}>
        <div style={{ background: 'rgba(11,42,32,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 11, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 10, background: 'rgba(52,211,153,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={phase >= 3 ? 'truck' : phase === 2 ? 'qr' : 'car'} size={19} color="#34D399" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 14.5, fontWeight: 700 }}>{cur.t}</div>
            {cur.s && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500 }}>{cur.s}</div>}
          </div>
          {phase < 3 && <div style={{ color: '#34D399', fontSize: 13, fontWeight: 800 }}>~{12 - phase * 4} min</div>}
        </div>
      </div>

      {/* QR scan flash */}
      {scanning && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,42,32,0.5)', animation: 'tp-fade-up 0.3s' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 22, animation: 'tp-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <QRCode value={flow.id} size={120} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', marginTop: 14, color: 'var(--emerald)' }}>
              <Icon name="check" size={18} color="var(--emerald)" strokeWidth={2.6} />
              <span style={{ fontSize: 14, fontWeight: 800 }}>Scanned</span>
            </div>
          </div>
        </div>
      )}

      {/* bottom sheet */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15, background: 'var(--surface)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '10px 20px 30px', boxShadow: '0 -8px 30px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)', margin: '0 auto 16px' }} />
        {/* driver row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, paddingBottom: 14, borderBottom: '1px solid var(--line-2)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(150deg,#1B2A4A,#0B3D2E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 19, flexShrink: 0 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>{driver?.name || 'Mathieu L.'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="star" size={13} color="#E8A33D" fill="#E8A33D" />
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{driver?.rating || 4.96}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 500 }}>· {driver?.car || 'Toyota RAV4'}</span>
            </div>
          </div>
          <button aria-label="Message driver" style={{ width: 44, height: 44, borderRadius: 13, border: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chat" size={20} color="var(--forest)" />
          </button>
          <button aria-label="Call driver" style={{ width: 44, height: 44, borderRadius: 13, border: 'none', background: 'var(--mint-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={20} color="var(--emerald)" />
          </button>
        </div>
        {/* progress steps mini */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {TRACK_STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= phase ? 'var(--emerald)' : 'var(--line)', transition: 'background 0.5s' }} />
          ))}
        </div>
        {done ? (
          <div style={{ marginTop: 14 }}>
            <Button onClick={onDone} iconRight="checkSm">Return confirmed — view receipt</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--muted)' }}>
            <Icon name="shield" size={15} color="var(--muted-2)" />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Return {flow.id} · insured in transit</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9 · Refund + completion
// ─────────────────────────────────────────────────────────────
function DoneScreen({ flow, onHome }) {
  const [rating, setRating] = React.useState(0);
  const timeline = [
    { t: 'Returned to store', s: 'Confirmed by ' + flow.store.name, done: true, now: false },
    { t: 'Refund initiated', s: `$${flow.amount.toFixed(2)} CAD to Visa •••• 4921`, done: true, now: true },
    { t: 'Refund posts to your card', s: 'Typically 2–3 business days', done: false, now: false },
  ];
  return (
    <div className="tp-scroll" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', paddingTop: 60, paddingBottom: 120 }}>
      <div style={{ background: 'linear-gradient(170deg,#0F4A38,#0B2A20)', padding: '30px 24px 40px', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, textAlign: 'center', color: '#fff' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(52,211,153,0.16)', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'tp-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={32} color="#0B3D2E" strokeWidth={3} />
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Return complete</div>
        <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 6 }}>Your refund is on its way back to you.</div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5, marginTop: 18 }}>${flow.amount.toFixed(2)}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>refund · CAD</div>
      </div>

      <div style={{ padding: '22px 20px 0' }}>
        <Card pad={18} style={{ borderRadius: 22 }}>
          {timeline.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: s.done ? 'var(--mint-soft)' : 'var(--bg)', border: s.done ? 'none' : '2px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.done && <Icon name="checkSm" size={14} color="var(--emerald)" strokeWidth={2.8} />}
                </div>
                {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 26, background: s.done ? 'var(--mint-2)' : 'var(--line)', margin: '3px 0' }} />}
              </div>
              <div style={{ paddingBottom: i < timeline.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{s.t}</span>
                  {s.now && <StatusPill tone="mint">Now</StatusPill>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginTop: 1 }}>{s.s}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* rate driver */}
        <Card pad={18} style={{ borderRadius: 22, marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 15.5, fontWeight: 700 }}>How was Mathieu?</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginTop: 2, marginBottom: 14 }}>Your rating keeps the network great</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`} style={{ background: 'none', border: 'none', padding: '5px', transition: 'transform 0.1s', transform: rating >= n ? 'scale(1.1)' : 'scale(1)' }}>
                <Icon name="star" size={34} color={rating >= n ? '#E8A33D' : 'var(--line)'} fill={rating >= n ? '#E8A33D' : 'none'} strokeWidth={1.6} />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <BottomBar>
        <Button onClick={onHome} icon="home">Back to home</Button>
      </BottomBar>
    </div>
  );
}

Object.assign(window, {
  StoreScreen, DetailsScreen, EligibilityScreen, ScheduleScreen, ReviewScreen,
  QRScreen, MatchingScreen, TrackingScreen, DoneScreen, TRACK_STEPS,
});
