import React, { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, ImageLine, LoadState, Notice, Title, Totals } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, artwork, money, plural, timeLabel } from "../shared/format";
import { useStore } from "../shared/store";
import { addressText, DropSchedule } from "./checkout";

const labels = {
  pending_payment: "Payment pending", payment_expired: "Payment expired", paid: "Confirmed",
  ready: "Packed", in_transit: "In transit", delivered: "Delivered"
};
const root = order => "/orders/" + order.orderRef;

export function Timeline({ entries }) {
  return <ol className="timeline">{entries.map(({ milestone, at, detail, upcoming }, index) =>
    <li className={upcoming ? "upcoming" : ""} key={milestone + index}>
      <span className="timeline-mark">{!upcoming && <Icon name="check" size={15}/>}</span>
      <div><strong>{milestone}</strong>{at ? <time dateTime={at}>{timeLabel(at)}</time> : <small>Pending</small>}{detail && <p>{detail}</p>}</div>
    </li>
  )}</ol>;
}

function Badge({ order }) {
  return <span className={"badge" + (order.paymentStatus === "paid" ? "" : " quiet")}>{labels[order.state] || order.state}</span>;
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
    <Title back="/orders" intro="Choose a payment outcome to test the checkout flow.">Demo payment</Title>
    {data.paymentStatus === "failed" && <Notice icon="info" tone="rose"><strong>Payment failed.</strong><span>You can retry this order before the payment window closes.</span></Notice>}
    <div className="panel payment-reference">
      <div><span>Reference</span><strong>{data.orderRef}</strong></div>
      <div><span>Payable amount</span><strong>{money(data.totalPaise)}</strong></div>
    </div>
    <ErrorMessage error={action.error}/>
    <div className="stack">
      {action.error?.code === "PAYMENT_EXPIRED" ? <Button to={root(data) + "/payment-pending"}>View payment status</Button> : <>
        <Button className="wide" icon="card" disabled={action.busy} onClick={() => submit("confirmed")}>Simulate payment of {money(data.totalPaise)}</Button>
        <Button secondary className="wide" disabled={action.busy} onClick={() => submit("pending")}>Simulate pending payment</Button>
        <Button secondary className="wide" disabled={action.busy} onClick={() => submit("failed")}>Simulate failed payment</Button>
      </>}
      <Button to="/orders" secondary className="wide">Pay later</Button>
    </div>
  </section>;
}

export function PaymentPending() {
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
    <Title>{expired ? "Payment window expired" : status === "pending" ? "Checking your payment" : "Payment awaiting completion"}</Title>
    <p>{expired ? "Start checkout again to get a new delivery quote." : status === "pending" ? "Your payment is being verified. This usually takes a few moments." : "Resume payment to confirm this order."}</p>
    <div className="panel payment-reference">
      <div><span>Reference</span><strong>{data.orderRef}</strong></div>
      <div><span>Payable amount</span><strong>{money(data.totalPaise)}</strong></div>
    </div>
    {expired ? <Button className="wide" to={data.planId ? "/packages/" + data.planId + "/checkout" : "/bag"}>Start a new checkout</Button> :
      status === "pending" ? <Button icon="refresh" className="wide" onClick={reload}>Check status</Button> :
      <Button icon="card" className="wide" to={root(data) + "/payment"}>Resume payment</Button>}
    <Button to="/orders" secondary icon="box" className="wide">Return to orders</Button>
  </section>;
}

export function Confirmation() {
  const order = useOrder();
  const { data } = order;
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  if (data.paymentStatus !== "paid") return <Navigate to={root(data) + "/payment-pending"} replace/>;
  return <section className="page narrow confirmation-page">
    <img className="page-art" src={artwork("confirmation")} alt=""/>
    <div className="status-page">
      <div className="checked-circle"><Icon name="check" size={34}/></div>
      <Title>Thank you!</Title>
      <p>Your order has been confirmed.</p>
      <div className="panel confirmation-facts">
        <div><span>Order reference</span><strong>{data.orderRef}</strong></div>
        <div><span>Expected delivery</span><strong><Icon name="calendar" size={18}/>{dateLabel(data.promiseBy)}</strong></div>
      </div>
      <p>Your {data.planId ? "first drop" : "order"} is expected by {timeLabel(data.promiseBy)} in Kolkata.</p>
      <Button className="wide" to={root(data) + "/tracking"}>View tracking</Button>
      <Button className="wide" secondary to="/shop">Continue shopping</Button>
    </div>
  </section>;
}

function OrderHelp({ order }) {
  return <Link className="action-row panel" to={order.returnRef ? "/refunds/" + order.returnRef : "/returns?order=" + order.orderRef}>
    <Icon name="headset"/><span><strong>{order.returnRef ? "View refund status" : "Need help with this order?"}</strong><small>{order.returnRef ? "Track your return request" : "Request a return or get order support"}</small></span><Icon name="chevron" size={17}/>
  </Link>;
}

export function Tracking() {
  const order = useOrder();
  const { data } = order;
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  if (data.paymentStatus !== "paid") return <Navigate to={root(data) + "/payment-pending"} replace/>;
  const milestones = ["Order confirmed", "Packed", "Rider assigned", "Delivered"].map(name =>
    data.timeline.find(entry => entry.milestone === name) || { milestone: name, upcoming: true });
  return <section className="page narrow order-page">
    <Title back={root(data)}>Track order</Title>
    <div className="panel tracking-header"><Icon name="box" size={30}/><div><strong>Order {data.orderRef}</strong><small>Delivery in {data.address.locality}, Kolkata</small></div><Badge order={data}/></div>
    <Timeline entries={milestones}/>
    <Notice icon="truck"><strong>{data.state === "delivered" ? "Delivered" : "Estimated delivery"}</strong><time>{timeLabel(data.state === "delivered" ? milestones.at(-1).at : data.promiseBy)}</time></Notice>
    <section className="order-section"><h2>Items in this order ({data.lines.length})</h2>{data.lines.map(line => <ImageLine key={line.id} line={line}/>)}</section>
    <OrderHelp order={data}/>
    <Button secondary className="wide" icon="refresh" onClick={order.reload}>Refresh tracking</Button>
  </section>;
}

export function OrderDetail() {
  const order = useOrder();
  const { data } = order;
  if (!data) return <section className="page narrow"><LoadState query={order}/></section>;
  const paid = data.paymentStatus === "paid";
  return <section className="page narrow order-page">
    <Title back="/orders">Order details</Title>
    <Notice icon={paid ? "check" : "info"} tone={paid ? "green" : "neutral"}><strong>{labels[data.state]}</strong><span>Order {data.orderRef} · {dateLabel(data.placedAt)}</span></Notice>
    <section className="order-section"><h2>Items ({data.lines.length})</h2>{data.lines.map(line => <ImageLine key={line.id} line={line}/>)}</section>
    <section className="order-section">
      <h2>{paid ? "Payment receipt" : "Payment summary"}</h2><Totals value={data} label={paid ? "Amount paid" : "Payable amount"}/>
      {paid && <div className="action-row"><Icon name="card"/><span><strong>Prepaid</strong><small>{timeLabel(data.paidAt)}</small></span><span className="badge">Paid</span></div>}
    </section>
    <section className="order-section"><h2>Delivery address</h2><div className="action-row"><Icon name="pin"/><span><strong>{data.address.name}</strong><small>{addressText(data.address)}</small></span></div></section>
    {paid ? <>
      <Button className="wide" to={root(data) + "/tracking"}>Track order</Button>
      {data.planId && <Button secondary className="wide" to={root(data) + "/package"}>Manage package</Button>}
      <OrderHelp order={data}/>
    </> : <Button className="wide" to={root(data) + "/payment-pending"}>View payment status</Button>}
  </section>;
}

export function Orders() {
  const orders = useApi("/orders");
  const [params, setParams] = useSearchParams();
  const past = params.get("tab") === "past";
  const { settle } = useStore();
  useEffect(() => { orders.data?.items.forEach(settle); }, [orders.data]);
  const items = orders.data?.items.filter(order => (["delivered", "payment_expired"].includes(order.state)) === past);
  return <section className="page narrow">
    <Title back="/account">My orders</Title>
    <div className="segmented" aria-label="Order views">
      <button type="button" aria-pressed={!past} onClick={() => setParams({})}>Recent orders</button>
      <button type="button" aria-pressed={past} onClick={() => setParams({ tab: "past" })}>Past orders</button>
    </div>
    {items ? items.length ? <div className="order-list">{items.map(order => <OrderCard order={order} key={order.orderRef}/>)}</div> :
      <Empty title={past ? "No past orders" : "No recent orders"} to="/shop" action="Shop essentials"/> : <LoadState query={orders}/>}
  </section>;
}

function OrderCard({ order }) {
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
      if (!added) throw new Error("These items are unavailable at the requested quantities.");
      announce(added < order.lines.length ? "Available items added to bag." : "Items added to bag.", "/bag", "View bag");
    });
  }
  return <article className="panel order-card">
    <Link className="order-card-link" to={root(order)}>
      <img src={order.lines[0].image} alt=""/>
      <div><strong>{order.orderRef}</strong><small>{plural(order.lines.reduce((total, line) => total + line.quantity, 0))} · {money(order.totalPaise)}</small><small>Placed {dateLabel(order.placedAt)}</small></div>
      <Badge order={order}/><Icon name="chevron" size={17}/>
    </Link>
    {order.paymentStatus === "paid" ? <Button className="wide" secondary icon="cart" disabled={action.busy} onClick={buyAgain}>Buy again</Button> :
      <Button className="wide" secondary to={root(order) + "/payment-pending"}>View payment status</Button>}
    <ErrorMessage error={action.error}/>
  </article>;
}
