import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, LoadState, Notice, Title } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, artwork, money } from "../shared/format";
import { useStore } from "../shared/store";
import { AddressForm, addressText, DropSchedule } from "./checkout";

export function Packages() {
  const plans = useApi("/plans");
  return <section className="page package-page">
    <img className="page-art package-art" src={artwork("package-hero")} alt="Hand-wrapped puja parcel beside a brass lamp and red hibiscus"/>
    <div className="package-intro">
      <Title intro="Curated puja essentials, delivered to your home on a weekly or monthly plan.">Puja Packages</Title>
      {plans.data ? <div className="plan-list">{plans.data.items.map(plan => <Link className="plan-card panel" key={plan.id} to={"/packages/" + plan.slug}>
        <Icon name="calendar" size={33}/>
        <span><strong>{plan.name}</strong><small>{plan.drops} {plan.cadence} puja parcels <span>({plan.duration})</span></small></span>
        <b>{money(plan.pricePaise)}</b><Icon name="chevron" size={19}/>
      </Link>)}</div> : <LoadState query={plans}/>}
    </div>
  </section>;
}

export function PackageDetail() {
  const { slug } = useParams();
  const plan = useApi("/plans/" + encodeURIComponent(slug));
  if (!plan.data) return <section className="page"><LoadState query={plan}/></section>;
  const data = plan.data;
  return <section className="page">
    <Title back="/packages" intro={data.drops + " " + data.cadence + " drops of essential puja items."}>{data.name} – Package Details</Title>
    <div className="two-column package-detail">
      <div>
        <img className="page-art" src={data.image} alt="Cotton wicks, incense sticks and camphor on a brass thali"/>
        <section className="order-section"><h2>What’s in each {data.cadence} drop?</h2>
          <ul className="plan-contents">{data.items.map(item => <li key={item.name}>
            {item.image ? <img src={item.image} alt=""/> : <Icon name={item.icon} size={29}/>}
            <span>{item.name}</span><small>{item.unit}</small>
          </li>)}</ul>
        </section>
      </div>
      <div>
        <section className="order-section"><h2>Your {data.drops} {data.cadence} drops</h2><div className="panel"><DropSchedule concise drops={data.dates.map((date, index) => ({ date, number: index + 1 }))}/></div></section>
        <p className="support-copy">First delivery within 24 hours for eligible Kolkata addresses. The full term is prepaid and can be renewed manually.</p>
        <div className="plan-total"><strong>Total ({data.drops} drops)</strong><b>{money(data.pricePaise)}</b></div>
        <Button className="wide" to={"/packages/" + slug + "/checkout"}>Choose Package</Button>
      </div>
    </div>
  </section>;
}

export function MyPackages() {
  const orders = useApi("/orders");
  const plans = orders.data?.items.filter(order => order.planId && order.paymentStatus === "paid");
  return <section className="page narrow">
    <Title back="/account">My Packages</Title>
    {plans ? plans.length ? <div className="order-list">{plans.map(order => <Link className="action-row panel" to={"/orders/" + order.orderRef + "/package"} key={order.orderRef}>
      <Icon name="box" size={28}/><span><strong>{order.lines[0].name}</strong><small>{order.orderRef} · {order.drops.filter(drop => drop.state === "delivered").length} of {order.drops.length} delivered</small></span><Icon name="chevron" size={18}/>
    </Link>)}</div> : <Empty title="No packages yet" to="/packages" action="Explore packages"/> : <LoadState query={orders}/>}
  </section>;
}

export function ManagePackage() {
  const { ref } = useParams();
  const order = useApi("/orders/" + encodeURIComponent(ref));
  const [params, setParams] = useSearchParams();
  const editing = params.get("edit") === "address";
  const edit = () => setParams({ edit: "address" });
  const done = () => setParams({});
  const action = useAction();
  const { announce } = useStore();
  if (!order.data) return <section className="page narrow"><LoadState query={order}/></section>;
  const data = order.data;
  if (!data.planId || data.paymentStatus !== "paid") return <section className="page narrow"><Empty title="Package unavailable" to="/account/packages" action="My packages"/></section>;
  const delivered = data.drops.filter(drop => drop.state === "delivered").length;
  const next = data.drops.find(drop => drop.state !== "delivered");
  const editable = data.drops.find(drop => drop.number > 1 && drop.state === "upcoming");
  const address = editable?.address || data.address;
  function change(newAddress) {
    action.run(async () => {
      await request("/orders/" + data.orderRef + "/package-address", { method: "PUT", body: { address: newAddress } });
      order.reload();
      done();
      announce("Address updated for upcoming drops.");
    });
  }
  return <section className="page narrow order-page">
    <Title back={editing ? "/orders/" + ref + "/package" : "/account/packages"}>{editing ? "Package delivery address" : "My Package"}</Title>
    {editing && editable ? <>
      <p className="support-copy">This address applies to upcoming drops after your first delivery.</p>
      <AddressForm initial={address} action={action} onSubmit={change} submitLabel="Update delivery address"/>
    </> : <>
      <div className="panel package-progress">
        <div className="action-row"><Icon name="box" size={31}/><span><strong>{data.lines[0].name}</strong><small>{data.drops.length} scheduled drops</small></span><span className="badge">{next ? "In Progress" : "Completed"}</span></div>
        <label htmlFor="package-progress">{delivered} of {data.drops.length} deliveries</label>
        <progress id="package-progress" value={delivered} max={data.drops.length}/>
      </div>
      {next && <Notice icon="truck"><strong>Next Drop · {dateLabel(next.date)}</strong><span>Drop {next.number} of {data.drops.length}</span></Notice>}
      <section className="order-section"><h2>Delivery Schedule</h2><DropSchedule drops={data.drops}/></section>
      {editable && <button type="button" className="action-row panel action-button" onClick={edit}>
        <Icon name="pin"/><span><strong>Manage Delivery Address</strong><small>{addressText(address)}</small></span><Icon name="chevron" size={18}/>
      </button>}
      <Link className="action-row panel" to={"/packages/" + data.planId}><Icon name="refresh"/><span><strong>Renew Package</strong><small>Review dates for another term</small></span><Icon name="chevron" size={18}/></Link>
    </>}
  </section>;
}
