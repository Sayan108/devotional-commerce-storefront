import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, ImageLine, LoadState, Notice, Title, Totals } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, artwork, money, timeLabel } from "../shared/format";
import { useBagCatalog, useStore } from "../shared/store";

function nextPath(value) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/account";
}

function CheckoutSteps({ current }) {
  return <ol className="checkout-steps" aria-label="Checkout progress">{["Cart", "Address", "Payment", "Order"].map((step, index) =>
    <li key={step} aria-current={current === index ? "step" : undefined} className={current > index ? "complete" : ""}>
      <span>{current > index && <Icon name="check" size={14}/>}</span>{step}
    </li>
  )}</ol>;
}

export function Login() {
  const [params] = useSearchParams();
  const next = nextPath(params.get("next"));
  const checkout = /^\/(?:checkout(?:\/|$)|packages\/[^/]+\/checkout)/.test(next);
  const { buyer } = useStore();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(null);
  const form = useRef(null);
  const { busy, error, run } = useAction();
  const mobile = phone ?? buyer?.phone ?? "";
  function send(guest) {
    run(async () => {
      const challenge = await request("/auth/challenges", { method: "POST", body: { phone: mobile, guest } });
      navigate("/verify" + (params.get("next") ? "?next=" + encodeURIComponent(next) : ""), { state: { challenge, guest } });
    });
  }
  if (buyer?.account || (checkout && buyer?.verified)) return <Navigate to={next} replace/>;
  return <section className="page narrow auth-page">
    <img className="page-art auth-art" src={artwork("login")} alt=""/>
    <div className="auth-content">
      <div className="ornament" aria-hidden="true"><Icon name="lotus" size={22}/></div>
      <Title>Welcome to Arghya</Title>
      <form className="stack" ref={form} onSubmit={event => { event.preventDefault(); send(false); }}>
        <label>Mobile number
          <span className="phone-field"><span>+91</span><input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
            pattern="[6-9][0-9]{9}" maxLength={10} value={mobile} placeholder="10-digit mobile number" required
            onChange={event => setPhone(event.target.value.replace(/\D/g, ""))}/></span>
        </label>
        <ErrorMessage error={error}/>
        <Button className="wide" type="submit" disabled={busy}>{busy ? "Sending code…" : "Continue"}</Button>
        {checkout && <Button className="wide" secondary disabled={busy} onClick={() => {
          if (form.current?.reportValidity()) send(true);
        }}>Continue as guest</Button>}
        {checkout && <small>Verify your mobile to access your order later.</small>}
      </form>
    </div>
    <img className="kolkata-sketch" src={artwork("kolkata-sketch")} alt=""/>
  </section>;
}

export function Verify() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = nextPath(params.get("next"));
  const [challenge, setChallenge] = useState(location.state?.challenge);
  const guest = location.state?.guest;
  const [code, setCode] = useState("");
  const [now, setNow] = useState(Date.now());
  const { setIdentity } = useStore();
  const { error, run, busy } = useAction();
  const input = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!challenge) return <Navigate replace to={"/login" + location.search}/>;
  const remaining = Math.max(0, Math.ceil((Date.parse(challenge.retryAt) - now) / 1000));
  function submit(event) {
    event.preventDefault();
    run(async () => {
      const verified = await request("/auth/challenges/verify", { method: "POST", body: { challengeId: challenge.challengeId, code } });
      setIdentity(verified);
      navigate(next, { replace: true });
    });
  }
  function resend() {
    run(async () => {
      const renewed = await request("/auth/challenges", { method: "POST", body: { phone: challenge.phone, guest } });
      setChallenge(renewed);
      setCode("");
      input.current?.focus();
    });
  }
  return <section className="page narrow auth-page verify-page">
    <img className="page-art auth-art" src={artwork("login")} alt=""/>
    <div className="auth-content">
      <Title>Verify your mobile number</Title>
      <p>Enter the six-digit code for <strong>+91 {challenge.phone}</strong>.</p>
      <form className="stack" onSubmit={submit}>
        <label className="otp-field">
          <span className="sr-only">Verification code</span>
          <span className="otp-slots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index}>{code[index] || ""}</span>)}</span>
          <input ref={input} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required
            value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))}/>
        </label>
        {challenge.fixtureCode && <small className="fixture-note">Demo verification code <strong>{challenge.fixtureCode}</strong></small>}
        <button type="button" className="text-button" disabled={busy || remaining > 0} onClick={resend}>{remaining > 0 ? "Resend code in 00:" + String(remaining).padStart(2, "0") : "Resend code"}</button>
        <ErrorMessage error={error}/>
        <Button className="wide" type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify code"}</Button>
        <Link className="text-button" to={"/login" + location.search}>Change mobile number</Link>
      </form>
    </div>
    <img className="kolkata-sketch" src={artwork("kolkata-sketch")} alt=""/>
  </section>;
}

const fields = [
  ["name", "Full name", "name", 120],
  ["phone", "Mobile number", "tel-national", 10, "tel", "[6-9][0-9]{9}"],
  ["street", "Street address", "street-address", 250],
  ["locality", "Locality / Area", "address-level3", 120],
  ["pin", "PIN code (Kolkata)", "postal-code", 6, "numeric", "[0-9]{6}"]
];

export function AddressForm({ initial = {}, onSubmit, action, saveOption, editLabel, submitLabel = "Continue", children }) {
  const form = useRef(null);
  const { error, busy } = action;
  useEffect(() => {
    const first = Object.keys(error?.fieldErrors || {})[0];
    if (first) form.current?.elements.namedItem(first)?.focus();
  }, [error]);
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit(Object.fromEntries(data), data.has("saveAddress"), data.has("isDefault"));
  }
  return <form className="stack address-form" ref={form} onSubmit={submit}>
    {editLabel && <label>Address label<input name="label" required maxLength={30} defaultValue={initial.label || "Home"}/></label>}
    {fields.map(([name, label, autoComplete, maxLength, inputMode, pattern]) => {
      const message = error?.fieldErrors?.[name];
      const id = "address-" + name;
      const input = {
        name, id, autoComplete, maxLength, inputMode, pattern, required: true, defaultValue: initial[name] || "",
        ...(message && { "aria-invalid": true, "aria-describedby": id + "-error" })
      };
      return <label key={name} htmlFor={id}>{label}
        {name === "street" ? <textarea {...input} rows={2}/> : <input {...input}/>}
        {message && <span className="field-error" id={id + "-error"}>{message}</span>}
      </label>;
    })}
    {saveOption && <label className="check-line"><input name="saveAddress" type="checkbox"/>Save this address for future orders</label>}
    {editLabel && <label className="check-line"><input name="isDefault" type="checkbox" defaultChecked={initial.isDefault} disabled={initial.isDefault}/>{initial.isDefault ? "Default address" : "Set as default address"}</label>}
    <ErrorMessage error={error}/>
    <Button className="wide" type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    {children}
  </form>;
}

export function addressText(address) {
  return address.street + ", " + address.locality + ", Kolkata – " + address.pin;
}

export function CheckoutAddress({ packageMode = false }) {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const editingQuote = params.get("quote");
  const { buyer, location } = useStore();
  const navigate = useNavigate();
  const listing = useBagCatalog();
  const plan = useApi(packageMode ? "/plans/" + encodeURIComponent(slug) : null);
  const addresses = useApi(buyer.account ? "/addresses" : null);
  const draft = useApi(editingQuote ? "/quotes/" + encodeURIComponent(editingQuote) : null);
  const [selectedId, setSelectedId] = useState(null);
  const action = useAction();
  const selected = addresses.data?.items.find(address => address.id === selectedId) ||
    (selectedId === null && !editingQuote ? addresses.data?.items.find(address => address.isDefault) : null);
  if (packageMode && !plan.data) return <section className="page"><LoadState query={plan}/></section>;
  if (!packageMode && !listing.lines.length) return <section className="page"><Empty title="Your bag is empty" to="/shop" action="Shop essentials"/></section>;
  if (!packageMode && !listing.data) return <section className="page"><LoadState query={listing}/></section>;
  if (addresses.loading) return <section className="page"><LoadState query={addresses}/></section>;
  if (draft.loading) return <section className="page"><LoadState query={draft}/></section>;

  function createQuote(address, saveAddress) {
    action.run(async () => {
      const selection = packageMode ? { planId: plan.data.id } : { lines: listing.lines.map(({ id, quantity }) => ({ id, quantity })) };
      const quote = await request("/quotes", { method: "POST", body: { ...selection, address, saveAddress } });
      const review = packageMode ? "/packages/" + slug + "/checkout/review" : "/checkout/review";
      navigate(review + "?" + new URLSearchParams({ quote: quote.quoteId }));
    });
  }
  const initial = selected || (selectedId === null && draft.data?.address) ||
    { phone: buyer.phone, name: buyer.name, pin: location?.pin, locality: location?.locality };
  return <section className="page narrow">
    <Title back={packageMode ? "/packages/" + slug : "/bag"}>Delivery address</Title>
    <CheckoutSteps current={1}/>
    {addresses.data?.items.length > 0 && <label className="stack saved-picker">Saved address
      <select value={selected?.id || ""} onChange={event => { setSelectedId(event.target.value); action.setError(null); }}>
        <option value="">Enter a new address</option>
        {addresses.data.items.map(address => <option value={address.id} key={address.id}>{address.label} · {address.street}</option>)}
      </select></label>}
    <AddressForm key={selected?.id || (selectedId === null ? editingQuote : null) || "new"} initial={initial} onSubmit={createQuote} action={action} saveOption={buyer.account && !selected}/>
  </section>;
}

export function DropSchedule({ drops, concise = false }) {
  return <ol className={"drop-schedule" + (concise ? " concise" : "")}>{drops.map(drop =>
    <li key={drop.number} className={drop.state === "delivered" ? "complete" : ""}>
      <span className="step-circle">{drop.state === "delivered" ? <Icon name="check" size={16}/> : concise ? <Icon name="box" size={17}/> : drop.number}</span>
      <div><strong>Drop {drop.number}</strong><time dateTime={drop.date}>{dateLabel(drop.date)}</time></div>
      {!concise && <small>{drop.state === "delivered" ? "Delivered" : drop.state === "in_transit" ? "In transit" : drop.number === 1 ? "Within 24 hours" : "Upcoming"}</small>}
    </li>
  )}</ol>;
}

export function CheckoutReview({ packageMode = false }) {
  const [params] = useSearchParams();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { rememberCheckout } = useStore();
  const id = params.get("quote");
  const quote = useApi(id ? "/quotes/" + encodeURIComponent(id) : null);
  const { data, error: loadError } = quote;
  const action = useAction();
  const back = packageMode ? "/packages/" + slug + "/checkout" : "/checkout";
  if (!id || loadError?.code === "QUOTE_EXPIRED") return <section className="page narrow"><Empty title="Refresh your checkout" to={back} action="Get a fresh quote">The quote is unavailable or has expired.</Empty></section>;
  if (!data) return <section className="page"><LoadState query={quote}/></section>;
  if ((packageMode && data.planId !== slug) || (!packageMode && data.planId)) return <Navigate to={back} replace/>;
  const editAddress = back + "?" + new URLSearchParams({ quote: id });

  function pay() {
    action.run(async () => {
      const order = await request("/orders", { method: "POST", headers: { "Idempotency-Key": id }, body: { quoteId: id } });
      rememberCheckout(order);
      const step = order.paymentStatus === "paid" ? "/confirmation" : order.paymentStatus === "pending" ? "/payment-pending" : "/payment";
      navigate("/orders/" + order.orderRef + step);
    });
  }
  return <section className="page">
    <Title back={editAddress}>{packageMode ? "Package Checkout" : "Review and pay"}</Title>
    <div className="two-column review-layout">
      <div className="review-main">
        <div className="panel address-review">
          <div className="address-review-top"><Icon name="pin"/><div><strong>Delivery address</strong><span>{data.address.name}</span><span>{addressText(data.address)}</span><span>+91 {data.address.phone}</span></div>{!data.orderRef && <Link to={editAddress}>Change</Link>}</div>
          <Notice icon="truck"><strong>Estimated arrival</strong><time>{timeLabel(data.promiseBy)}</time></Notice>
        </div>
        {packageMode ? <section className="order-section">
          <h2>Delivery Schedule</h2><Notice icon="truck"><strong>First drop within 24 hours</strong></Notice>
          <DropSchedule drops={data.drops}/>
        </section> : <div className="review-items">{data.lines.map(line => <ImageLine key={line.id} line={line}/>)}</div>}
      </div>
      <aside className="checkout-summary">
        {packageMode && <h2>{data.lines[0].name} ({data.drops.length} drops)</h2>}
        <Totals value={data} label="Payable amount"/>
        <Notice icon="card" tone="neutral"><strong>Prepaid (Pay online)</strong>{packageMode && <span>Pay once for every delivery.</span>}</Notice>
        <small className="quote-expiry">Quote expires {timeLabel(data.expiresAt)}</small>
        <ErrorMessage error={action.error}/>
        {action.error?.status === 409 ? <Button className="wide" to={back}>Review a fresh quote</Button> :
          <Button className="wide" icon="lock" onClick={pay} disabled={action.busy}>{action.busy ? "Preparing payment…" : data.orderRef ? "Resume payment" : "Pay " + money(data.totalPaise)}</Button>}
        <div className="checkout-links"><Link to="/help/shipping">Shipping</Link><Link to="/help/cancellation">Cancellation &amp; refunds</Link></div>
      </aside>
    </div>
  </section>;
}
