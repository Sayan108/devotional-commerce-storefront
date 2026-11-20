import React, { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, ImageLine, LoadState, Notice, Title, Totals } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { assetUrl } from "../env.ts";
import { dateLabel, artwork, money, numeral, timeLabel } from "../shared/format";
import { useI18n } from "../shared/i18n";
import { useStore } from "../shared/store";
import { addressText, DropSchedule } from "./checkout";

const stateKeys = {
  pending_payment: "paymentPending", payment_expired: "paymentExpired", paid: "confirmed",
  ready: "packed", in_transit: "inTransit", delivered: "delivered"
};
const root = order => "/orders/" + order.orderRef;

export function Timeline({ entries }) {
  const { t, tx } = useI18n();
  return <ol className="timeline">{entries.map(({ milestone, at, detail, upcoming }, index) =>
    <li className={upcoming ? "upcoming" : ""} key={milestone + index}>
      <span className="timeline-mark">{!upcoming && <Icon name="check" size={15}/>}</span>
      <div><strong>{tx(milestone)}</strong>{at ? <time dateTime={at}>{timeLabel(at)}</time> : <small>{t("pending")}</small>}{detail && <p>{tx(detail)}</p>}</div>
    </li>
  )}</ol>;
}

function Badge({ order }) {
  const { t } = useI18n();
  return <span className={"badge" + (order.paymentStatus === "paid" ? "" : " quiet")}>{stateKeys[order.state] ? t(stateKeys[order.state]) : order.state}</span>;
}

function useOrder() {
  const { ref } = useParams();
  const { settle } = useStore();
  const order = useApi("/orders/" + encodeURIComponent(ref));
  useEffect(() => {
    if (order.data?.paymentStatus === "paid") settle(order.data);
  }, [order.data]);
  return order;
}

export function Payment() {
  const { t } = useI18n();
  const order = useOrder();
  const navigate = useNavigate();
  const action = useAction();
  if (!order.data) return <section className="page narrow"><LoadState query={order}/></section>;
  const data = order.data;
  if (data.paymentStatus === "paid") return <Navigate to={root(data) + "/confirmation"} replace/>;
  if (["pending", "expired"].includes(data.paymentStatus)) return <Navigate to={root(data) + "/payment-pending"} replace/>;

  function submit(outcome) {
    action.run(async () => {
      const result = await request("/payments/verify", { method: "POST", body: { orderRef: data.orderRef, outcome } });
      if (result.paymentStatus === "failed") order.reload();
      else navigate(root(result) + (result.paymentStatus === "paid" ? "/confirmation" : "/payment-pending"), { replace: true });
    });
  }
  return <section className="page narrow">
    <Title back="/orders" intro={t("demoIntro")}>{t("demoPayment")}</Title>
    {data.paymentStatus === "failed" && <Notice icon="info" tone="rose"><strong>{t("paymentFailed")}</strong><span>{t("retryWindow")}</span></Notice>}
    <div className="panel payment-reference">
      <div><span>{t("reference")}</span><strong>{data.orderRef}</strong></div>
      <div><span>{t("payable")}</span><strong>{money(data.totalPaise)}</strong></div>
    </div>
    <ErrorMessage error={action.error}/>
    <div className="stack">
      {action.error?.code === "PAYMENT_EXPIRED" ? <Button to={root(data) + "/payment-pending"}>{t("viewPayment")}</Button> : <>
        <Button className="wide" icon="card" disabled={action.busy} onClick={() => submit("confirmed")}>{t("simulatePay", { amount: money(data.totalPaise) })}</Button>
        <Button secondary className="wide" disabled={action.busy} onClick={() => submit("pending")}>{t("simulatePending")}</Button>
        <Button secondary className="wide" disabled={action.busy} onClick={() => submit("failed")}>{t("simulateFailed")}</Button>
      </>}
      <Button to="/orders" secondary className="wide">{t("payLater")}</Button>
    </div>
  </section>;
}

export function PaymentPending() {
  const { t } = useI18n();
  const order = useOrder();
  const { data, reload } = order;
  const status = data?.paymentStatus;
  useEffect(() => {
    if (status !== "pending") return;
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [status]);
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  if (status === "paid") return <Navigate to={root(data) + "/confirmation"} replace/>;
  const expired = status === "expired";
  return <section className="page narrow status-page payment-pending">
    <div className="status-icon rose"><Icon name="card" size={55}/></div>
    <Title>{expired ? t("windowExpired") : status === "pending" ? t("checkingPayment") : t("awaitingPayment")}</Title>
    <p>{expired ? t("startAgain") : status === "pending" ? t("verifyingPayment") : t("resumeToConfirm")}</p>
    <div className="panel payment-reference">
      <div><span>{t("reference")}</span><strong>{data.orderRef}</strong></div>
      <div><span>{t("payable")}</span><strong>{money(data.totalPaise)}</strong></div>
    </div>
    {expired ? <Button className="wide" to={data.planId ? "/packages/" + data.planId + "/checkout" : "/bag"}>{t("newCheckout")}</Button> :
      status === "pending" ? <Button icon="refresh" className="wide" onClick={reload}>{t("checkStatus")}</Button> :
      <Button icon="card" className="wide" to={root(data) + "/payment"}>{t("resumePayment")}</Button>}
    <Button to="/orders" secondary icon="box" className="wide">{t("returnOrders")}</Button>
  </section>;
}

export function Confirmation() {
  const { t } = useI18n();
  const order = useOrder();
  const { data } = order;
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  if (data.paymentStatus !== "paid") return <Navigate to={root(data) + "/payment-pending"} replace/>;
  return <section className="page narrow confirmation-page">
    <img className="page-art" src={artwork("confirmation")} alt=""/>
    <div className="status-page">
      <div className="checked-circle"><Icon name="check" size={34}/></div>
      <Title>{t("thankYou")}</Title>
      <p>{t("orderConfirmed")}</p>
      <div className="panel confirmation-facts">
        <div><span>{t("orderReference")}</span><strong>{data.orderRef}</strong></div>
        <div><span>{t("expectedDelivery")}</span><strong><Icon name="calendar" size={18}/>{dateLabel(data.promiseBy)}</strong></div>
      </div>
      <p>{t("arrivalLine", { kind: data.planId ? t("firstDrop") : t("orderNoun"), time: timeLabel(data.promiseBy), city: t("kolkata") })}</p>
      <Button className="wide" to={root(data) + "/tracking"}>{t("viewTracking")}</Button>
      <Button className="wide" secondary to="/shop">{t("continueShopping")}</Button>
    </div>
  </section>;
}

function OrderHelp({ order }) {
  const { t } = useI18n();
  return <Link className="action-row panel" to={order.returnRef ? "/refunds/" + order.returnRef : "/returns?order=" + order.orderRef}>
    <Icon name="headset"/><span><strong>{order.returnRef ? t("viewRefund") : t("needHelp")}</strong><small>{order.returnRef ? t("trackReturn") : t("requestReturn")}</small></span><Icon name="chevron" size={17}/>
  </Link>;
}

export function Tracking() {
  const { t, tx } = useI18n();
  const order = useOrder();
  const { data } = order;
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  if (data.paymentStatus !== "paid") return <Navigate to={root(data) + "/payment-pending"} replace/>;
  const milestones = ["Order confirmed", "Packed", "Rider assigned", "Delivered"].map(name =>
    data.timeline.find(entry => entry.milestone === name) || { milestone: name, upcoming: true });
  return <section className="page narrow order-page">
    <Title back={root(data)}>{t("trackOrder")}</Title>
    <div className="panel tracking-header"><Icon name="box" size={30}/><div><strong>{t("orderTitle", { ref: data.orderRef })}</strong><small>{t("deliveryIn", { place: tx(data.address.locality), city: t("kolkata") })}</small></div><Badge order={data}/></div>
    <Timeline entries={milestones}/>
    <Notice icon="truck"><strong>{data.state === "delivered" ? t("delivered") : t("estimated")}</strong><time>{timeLabel(data.state === "delivered" ? milestones.at(-1).at : data.promiseBy)}</time></Notice>
    <section className="order-section"><h2>{t("itemsInOrder", { count: numeral(data.lines.length) })}</h2>{data.lines.map(line => <ImageLine key={line.id} line={line}/>)}</section>
    <OrderHelp order={data}/>
    <Button secondary className="wide" icon="refresh" onClick={order.reload}>{t("refreshTracking")}</Button>
  </section>;
}

export function OrderDetail() {
  const { t } = useI18n();
  const order = useOrder();
  const { data } = order;
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  const paid = data.paymentStatus === "paid";
  return <section className="page narrow order-page">
    <Title back="/orders">{t("orderDetails")}</Title>
    <Notice icon={paid ? "check" : "info"} tone={paid ? "green" : "neutral"}><strong>{stateKeys[data.state] ? t(stateKeys[data.state]) : data.state}</strong><span>{t("orderMeta", { ref: data.orderRef, date: dateLabel(data.placedAt) })}</span></Notice>
    <section className="order-section"><h2>{t("itemsCount", { count: numeral(data.lines.length) })}</h2>{data.lines.map(line => <ImageLine key={line.id} line={line}/>)}</section>
    <section className="order-section">
      <h2>{paid ? t("paymentReceipt") : t("paymentSummary")}</h2><Totals value={data} label={paid ? t("amountPaid") : t("payable")}/>
      {paid && <div className="action-row"><Icon name="card"/><span><strong>{t("prepaidShort")}</strong><small>{timeLabel(data.paidAt)}</small></span><span className="badge">{t("paid")}</span></div>}
    </section>
    <section className="order-section"><h2>{t("deliveryAddress")}</h2><div className="action-row"><Icon name="pin"/><span><strong>{data.address.name}</strong><small>{addressText(data.address, t("kolkata"))}</small></span></div></section>
    {paid ? <>
      <Button className="wide" to={root(data) + "/tracking"}>{t("trackOrder")}</Button>
      {data.planId && <Button secondary className="wide" to={root(data) + "/package"}>{t("managePackage")}</Button>}
      <OrderHelp order={data}/>
    </> : <Button className="wide" to={root(data) + "/payment-pending"}>{t("viewPayment")}</Button>}
  </section>;
}

export function Orders() {
  const { t } = useI18n();
  const orders = useApi("/orders");
  const [params, setParams] = useSearchParams();
  const past = params.get("tab") === "past";
  const { settle } = useStore();
  useEffect(() => { orders.data?.items.forEach(settle); }, [orders.data]);
  const items = orders.data?.items.filter(order => (["delivered", "payment_expired"].includes(order.state)) === past);
  return <section className="page narrow">
    <Title back="/account">{t("myOrders")}</Title>
    <div className="segmented" aria-label={t("orderViews")}>
      <button type="button" aria-pressed={!past} onClick={() => setParams({})}>{t("recentOrders")}</button>
      <button type="button" aria-pressed={past} onClick={() => setParams({ tab: "past" })}>{t("pastOrders")}</button>
    </div>
    {items ? items.length ? <div className="order-list">{items.map(order => <OrderCard order={order} key={order.orderRef}/>)}</div> :
      <Empty title={past ? t("noPast") : t("noRecent")} to="/shop" action={t("heroCta")}/> : <LoadState query={orders} kind="list"/>}
  </section>;
}

function OrderCard({ order }) {
  const { t } = useI18n();
  const { add, announce } = useStore();
  const navigate = useNavigate();
  const action = useAction();
  function buyAgain() {
    if (order.planId) { navigate("/packages/" + order.planId); return; }
    action.run(async () => {
      const { items } = await request("/products");
      let added = 0;
      for (const line of order.lines) {
        const product = items.find(item => item.slug === line.slug);
        const variant = product?.variants.find(item => item.id === line.id);
        if (variant && add(product, variant, line.quantity, false)) added++;
      }
      if (!added) throw new Error(t("unavailableQty"));
      announce(added < order.lines.length ? t("someAdded") : t("allAdded"), "/bag", t("viewBag"));
    });
  }
  return <article className="panel order-card">
    <Link className="order-card-link" to={root(order)}>
      <img src={assetUrl(order.lines[0].image)} alt=""/>
      <div><strong>{order.orderRef}</strong><small>{t("itemCount", { count: numeral(order.lines.reduce((total, line) => total + line.quantity, 0)) })} · {money(order.totalPaise)}</small><small>{t("placedOn", { date: dateLabel(order.placedAt) })}</small></div>
      <Badge order={order}/><Icon name="chevron" size={17}/>
    </Link>
    {order.paymentStatus === "paid" ? <Button className="wide" secondary icon="cart" disabled={action.busy} onClick={buyAgain}>{t("buyAgain")}</Button> :
      <Button className="wide" secondary to={root(order) + "/payment-pending"}>{t("viewPayment")}</Button>}
    <ErrorMessage error={action.error}/>
  </article>;
}
