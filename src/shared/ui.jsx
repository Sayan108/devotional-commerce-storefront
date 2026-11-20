import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useStore } from "./store";
import { money, numeral } from "./format";
import { useI18n } from "./i18n";
const strokes = {
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  search: <><circle cx="10.6" cy="10.6" r="6.6"/><path d="m16 16 4.5 4.5"/></>,
  heart: <path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21l7.1-6.4 1.7-1.7a5 5 0 0 0 0-7.1Z"/>,
  bag: <><path d="M5 7h14l2 13H3L5 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></>,
  cart: <><path d="M2 3h3l3 12h11l3-9H6M8 15l-1 3h13"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  down: <path d="m5 9 7 7 7-7"/>,
  back: <path d="m12 5-7 7 7 7M5 12h15"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  plus: <path d="M5 12h14M12 5v14"/>,
  minus: <path d="M5 12h14"/>,
  filter: <path d="M3 4h18l-7 8v6l-4 2v-8Z"/>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  home: <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3Z"/>,
  box: <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10M7.5 4.5l9 5v4"/>,
  user: <><circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></>,
  truck: <><path d="M2 5h12v13H2V5Zm12 4h4l4 4v5h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h1m3 0h1m3 0h1m-9 4h1m3 0h1"/></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M3 10h18M6 15h5"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
  headset: <><path d="M3 14v-2a9 9 0 0 1 18 0v5a4 4 0 0 1-4 4h-4"/><rect x="2" y="12" width="5" height="7" rx="2"/><rect x="17" y="12" width="5" height="7" rx="2"/></>,
  refresh: <><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m-5 0h5v5"/></>,
  edit: <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14l-1 7Z"/>,
  camera: <><path d="M3 7h5l2-3h4l2 3h5v13H3Z"/><circle cx="12" cy="13" r="3"/></>,
  logout: <path d="M12 4H4v16h8M9 12h12m-4-4 4 4-4 4"/>,
  lotus: <path d="M12 21C5 21 2 17 1 11c5 0 9 2 11 10Zm0 0c7 0 10-4 11-10-5 0-9 2-11 10Zm0 0c-5-5-5-11 0-18 5 7 5 13 0 18Z"/>,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.1"/></>
};

export function Icon({ name, size = 22, filled = false }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{strokes[name]}</svg>;
}

export function Button({ to, icon, secondary, children, className = "", ...props }) {
  const style = "button" + (secondary ? " secondary" : "") + " " + className;
  const label = <>{icon && <Icon name={icon} size={20}/>} {children}</>;
  return to ? <Link className={style} to={to} {...props}>{label}</Link> :
    <button className={style} type="button" {...props}>{label}</button>;
}

export function Title({ children, back, intro }) {
  const { t } = useI18n();
  return <div className="page-title"><div>{back && <Link className="icon-button" to={back} aria-label={t("goBack")}><Icon name="back"/></Link>}<h1>{children}</h1></div>{intro && <p>{intro}</p>}</div>;
}

export function ErrorMessage({ error }) {
  const { tx } = useI18n();
  if (!error) return null;
  const message = typeof error === "string" ? error : error.message;
  return <p className="form-error" role="alert">{tx(message)}</p>;
}

export function LoadState({ query }) {
  const { t } = useI18n();
  if (query.error) return <div className="empty"><ErrorMessage error={query.error}/><Button secondary onClick={query.reload}>{t("tryAgain")}</Button></div>;
  return <p className="loading" role="status">{t("loading")}</p>;
}

export function Empty({ title, children, to, action, image }) {
  return <div className="empty">
    {image && <img src={image} alt=""/>}
    <h2>{title}</h2>{children && <p>{children}</p>}{to && <Button to={to}>{action}</Button>}
  </div>;
}

export function Stepper({ label, value, onChange, max = 10 }) {
  const { t } = useI18n();
  const name = label || t("quantity");
  return <div className="stepper" aria-label={name} role="group">
    <button type="button" aria-label={t("decrease", { label: name })} disabled={value <= 1} onClick={() => onChange(value - 1)}><Icon name="minus" size={17}/></button>
    <span aria-live="polite">{numeral(value)}</span>
    <button type="button" aria-label={t("increase", { label: name })} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={17}/></button>
  </div>;
}

export function BuyerGate({ account = false, children }) {
  const { buyer, authError } = useStore();
  const { t } = useI18n();
  const location = useLocation();
  if (authError) return <div className="page"><ErrorMessage error={authError}/><Button onClick={() => window.location.reload()}>{t("tryAgain")}</Button></div>;
  if (!buyer) return <p className="loading" role="status">{t("checkingSession")}</p>;
  if (!buyer.verified || (account && !buyer.account)) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate replace to={"/login?next=" + next}/>;
  }
  return children;
}

export function Notice({ icon = "info", children, tone = "green" }) {
  return <div className={"notice " + tone}><Icon name={icon}/><div>{children}</div></div>;
}

export function ImageLine({ line, children }) {
  const { t, tx } = useI18n();
  return <div className="image-line">
    {line.image && <img src={line.image} alt=""/>}
    <div><strong>{tx(line.name)}</strong><small>{t("qty", { count: numeral(line.quantity) })}{line.unit && " · " + tx(line.unit)}</small>{children}</div>
    <b>{money(line.pricePaise * line.quantity)}</b>
  </div>;
}

export function Totals({ value, label, className = "" }) {
  const { t } = useI18n();
  return <dl className={"totals " + className}>
    <div><dt>{t("itemsTotal")}</dt><dd>{money(value.subtotalPaise)}</dd></div>
    <div><dt>{t("delivery")}</dt><dd>{value.deliveryPaise ? money(value.deliveryPaise) : t("free")}</dd></div>
    {value.taxPaise > 0 && <div><dt>{t("tax")}</dt><dd>{money(value.taxPaise)}</dd></div>}
    <div className="grand"><dt>{label || t("total")}</dt><dd>{money(value.totalPaise)}</dd></div>
  </dl>;
}
