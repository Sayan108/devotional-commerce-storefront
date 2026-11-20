import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, ImageLine, LoadState, Notice, Title, Totals } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, artwork, money, numeral, timeLabel } from "../shared/format";
import { useI18n } from "../shared/i18n";
import { useBagCatalog, useStore } from "../shared/store";

function nextPath(value) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/account";
}

function CheckoutSteps({ current }) {
  const { t } = useI18n();
  const steps = ["cart", "address", "payment", "order"];
  return <ol className="checkout-steps" aria-label={t("checkoutProgress")}>{steps.map((step, index) =>
    <li key={step} aria-current={current === index ? "step" : undefined} className={current > index ? "complete" : ""}>
      <span>{current > index && <Icon name="check" size={14}/>}</span>{t(step)}
    </li>
  )}</ol>;
}

export function Login() {
  const { t } = useI18n();
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
      <Title>{t("welcome")}</Title>
      <form className="stack" ref={form} onSubmit={event => { event.preventDefault(); send(false); }}>
        <label>{t("mobileNumber")}
          <span className="phone-field"><span>+91</span><input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
            pattern="[6-9][0-9]{9}" maxLength={10} value={mobile} placeholder={t("mobilePlaceholder")} required
            onChange={event => setPhone(event.target.value.replace(/\D/g, ""))}/></span>
        </label>
        <ErrorMessage error={error}/>
        <Button className="wide" type="submit" disabled={busy}>{busy ? t("sending") : t("continue")}</Button>
        {checkout && <Button className="wide" secondary disabled={busy} onClick={() => {
          if (form.current?.reportValidity()) send(true);
        }}>{t("continueGuest")}</Button>}
        {checkout && <small>{t("guestHint")}</small>}
      </form>
    </div>
    <img className="kolkata-sketch" src={artwork("kolkata-sketch")} alt=""/>
  </section>;
}

export function Verify() {
  const { t } = useI18n();
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
      <Title>{t("verifyMobile")}</Title>
      <p>{t("enterCode")} <strong>+91 {challenge.phone}</strong>.</p>
      <form className="stack" onSubmit={submit}>
        <label className="otp-field">
          <span className="sr-only">{t("verificationCode")}</span>
          <span className="otp-slots" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index}>{code[index] || ""}</span>)}</span>
          <input ref={input} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required
            value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))}/>
        </label>
        {challenge.fixtureCode && <small className="fixture-note">{t("demoCode")} <strong>{challenge.fixtureCode}</strong></small>}
        <button type="button" className="text-button" disabled={busy || remaining > 0} onClick={resend}>{remaining > 0 ? t("resendIn", { time: "00:" + String(remaining).padStart(2, "0") }) : t("resend")}</button>
        <ErrorMessage error={error}/>
        <Button className="wide" type="submit" disabled={busy}>{busy ? t("verifying") : t("verifyCode")}</Button>
        <Link className="text-button" to={"/login" + location.search}>{t("changeMobile")}</Link>
      </form>
    </div>
    <img className="kolkata-sketch" src={artwork("kolkata-sketch")} alt=""/>
  </section>;
}

const fields = [
  ["name", "fullName", "name", 120],
  ["phone", "mobileNumber", "tel-national", 10, "tel", "[6-9][0-9]{9}"],
  ["street", "street", "street-address", 250],
  ["locality", "locality", "address-level3", 120],
  ["pin", "pinKolkata", "postal-code", 6, "numeric", "[0-9]{6}"]
];

export function AddressForm({ initial = {}, onSubmit, action, saveOption, editLabel, submitLabel, children }) {
  const { t, tx } = useI18n();
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
    {editLabel && <label>{t("addressLabel")}<input name="label" required maxLength={30} defaultValue={initial.label || "Home"}/></label>}
    {fields.map(([name, label, autoComplete, maxLength, inputMode, pattern]) => {
      const message = error?.fieldErrors?.[name];
      const id = "address-" + name;
      const input = {
        name, id, autoComplete, maxLength, inputMode, pattern, required: true, defaultValue: initial[name] || "",
        ...(message && { "aria-invalid": true, "aria-describedby": id + "-error" })
      };
      return <label key={name} htmlFor={id}>{t(label)}
        {name === "street" ? <textarea {...input} rows={2}/> : <input {...input}/>}
        {message && <span className="field-error" id={id + "-error"}>{tx(message)}</span>}
      </label>;
    })}
    {saveOption && <label className="check-line"><input name="saveAddress" type="checkbox"/>{t("saveAddress")}</label>}
    {editLabel && <label className="check-line"><input name="isDefault" type="checkbox" defaultChecked={initial.isDefault} disabled={initial.isDefault}/>{initial.isDefault ? t("defaultAddress") : t("setDefault")}</label>}
    <ErrorMessage error={error}/>
    <Button className="wide" type="submit" disabled={busy}>{busy ? t("saving") : (submitLabel || t("continue"))}</Button>
    {children}
  </form>;
}

export function addressText(address, city = "Kolkata") {
  return address.street + ", " + address.locality + ", " + city + " – " + address.pin;
}

export function CheckoutAddress({ packageMode = false }) {
  const { t } = useI18n();
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
  if (!packageMode && !listing.lines.length) return <section className="page"><Empty title={t("bagEmpty")} to="/shop" action={t("heroCta")}/></section>;
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
    <Title back={packageMode ? "/packages/" + slug : "/bag"}>{t("deliveryAddress")}</Title>
    <CheckoutSteps current={1}/>
    {addresses.data?.items.length > 0 && <label className="stack saved-picker">{t("savedAddress")}
      <select value={selected?.id || ""} onChange={event => { setSelectedId(event.target.value); action.setError(null); }}>
        <option value="">{t("newAddress")}</option>
        {addresses.data.items.map(address => <option value={address.id} key={address.id}>{address.label} · {address.street}</option>)}
      </select></label>}
    <AddressForm key={selected?.id || (selectedId === null ? editingQuote : null) || "new"} initial={initial} onSubmit={createQuote} action={action} saveOption={buyer.account && !selected}/>
  </section>;
}

export function DropSchedule({ drops, concise = false }) {
  const { t } = useI18n();
  const stateLabel = drop => drop.state === "delivered" ? t("delivered") : drop.state === "in_transit" ? t("inTransit") : drop.number === 1 ? t("withinDay") : t("upcoming");
  return <ol className={"drop-schedule" + (concise ? " concise" : "")}>{drops.map(drop =>
    <li key={drop.number} className={drop.state === "delivered" ? "complete" : ""}>
      <span className="step-circle">{drop.state === "delivered" ? <Icon name="check" size={16}/> : concise ? <Icon name="box" size={17}/> : numeral(drop.number)}</span>
      <div><strong>{t("dropN", { number: numeral(drop.number) })}</strong><time dateTime={drop.date}>{dateLabel(drop.date)}</time></div>
      {!concise && <small>{stateLabel(drop)}</small>}
    </li>
  )}</ol>;
}

export function CheckoutReview({ packageMode = false }) {
  const { t, tx } = useI18n();
  const [params] = useSearchParams();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { rememberCheckout } = useStore();
  const id = params.get("quote");
  const quote = useApi(id ? "/quotes/" + encodeURIComponent(id) : null);
  const { data, error: loadError } = quote;
  const action = useAction();
  const back = packageMode ? "/packages/" + slug + "/checkout" : "/checkout";
  if (!id || loadError?.code === "QUOTE_EXPIRED") return <section className="page narrow"><Empty title={t("refreshCheckout")} to={back} action={t("freshQuote")}>{t("quoteExpired")}</Empty></section>;
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
    <Title back={editAddress}>{packageMode ? t("packageCheckout") : t("reviewPay")}</Title>
    <div className="two-column review-layout">
      <div className="review-main">
        <div className="panel address-review">
          <div className="address-review-top"><Icon name="pin"/><div><strong>{t("deliveryAddress")}</strong><span>{data.address.name}</span><span>{addressText(data.address, t("kolkata"))}</span><span>+91 {data.address.phone}</span></div>{!data.orderRef && <Link to={editAddress}>{t("change")}</Link>}</div>
          <Notice icon="truck"><strong>{t("estimatedArrival")}</strong><time>{timeLabel(data.promiseBy)}</time></Notice>
        </div>
        {packageMode ? <section className="order-section">
          <h2>{t("deliverySchedule")}</h2><Notice icon="truck"><strong>{t("firstDropDay")}</strong></Notice>
          <DropSchedule drops={data.drops}/>
        </section> : <div className="review-items">{data.lines.map(line => <ImageLine key={line.id} line={line}/>)}</div>}
      </div>
      <aside className="checkout-summary">
        {packageMode && <h2>{t("dropsCount", { name: tx(data.lines[0].name), count: numeral(data.drops.length) })}</h2>}
        <Totals value={data} label={t("payable")}/>
        <Notice icon="card" tone="neutral"><strong>{t("prepaid")}</strong>{packageMode && <span>{t("payOnce")}</span>}</Notice>
        <small className="quote-expiry">{t("quoteExpires", { time: timeLabel(data.expiresAt) })}</small>
        <ErrorMessage error={action.error}/>
        {action.error?.status === 409 ? <Button className="wide" to={back}>{t("reviewFresh")}</Button> :
          <Button className="wide" icon="lock" onClick={pay} disabled={action.busy}>{action.busy ? t("preparing") : data.orderRef ? t("resumePayment") : t("payAmount", { amount: money(data.totalPaise) })}</Button>}
        <div className="checkout-links"><Link to="/help/shipping">{t("shipping")}</Link><Link to="/help/cancellation">{t("cancellation")}</Link></div>
      </aside>
    </div>
  </section>;
}
