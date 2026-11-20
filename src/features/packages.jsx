import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, LoadState, Notice, Title } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, artwork, money, numeral } from "../shared/format";
import { useI18n } from "../shared/i18n";
import { useStore } from "../shared/store";
import { AddressForm, addressText, DropSchedule } from "./checkout";

export function Packages() {
  const plans = useApi("/plans");
  const { t, tx } = useI18n();
  return <section className="page package-page">
    <img className="page-art package-art" src={artwork("package-hero")} alt={t("packageAltLong")}/>
    <div className="package-intro">
      <Title intro={t("packageIntro")}>{t("pujaPackages")}</Title>
      {plans.data ? <div className="plan-list">{plans.data.items.map(plan => <Link className="plan-card panel" key={plan.id} to={"/packages/" + plan.slug}>
        <Icon name="calendar" size={33}/>
        <span><strong>{tx(plan.name)}</strong><small>{t("pujaParcels", { count: numeral(plan.drops), cadence: tx(plan.cadence) })} <span>{t("durationWrap", { duration: tx(plan.duration) })}</span></small></span>
        <b>{money(plan.pricePaise)}</b><Icon name="chevron" size={19}/>
      </Link>)}</div> : <LoadState query={plans}/>}
    </div>
  </section>;
}

export function PackageDetail() {
  const { slug } = useParams();
  const { t, tx } = useI18n();
  const plan = useApi("/plans/" + encodeURIComponent(slug));
  if (!plan.data) return <section className="page"><LoadState query={plan}/></section>;
  const data = plan.data;
  const cadence = tx(data.cadence);
  return <section className="page">
    <Title back="/packages" intro={t("packageDetailIntro", { count: numeral(data.drops), cadence })}>{t("packageDetails", { name: tx(data.name) })}</Title>
    <div className="two-column package-detail">
      <div>
        <img className="page-art" src={data.image} alt={t("thaliAlt")}/>
        <section className="order-section"><h2>{t("eachDrop", { cadence })}</h2>
          <ul className="plan-contents">{data.items.map(item => <li key={item.name}>
            {item.image ? <img src={item.image} alt=""/> : <Icon name={item.icon} size={29}/>}
            <span>{tx(item.name)}</span><small>{tx(item.unit)}</small>
          </li>)}</ul>
        </section>
      </div>
      <div>
        <section className="order-section"><h2>{t("yourDrops", { count: numeral(data.drops), cadence })}</h2><div className="panel"><DropSchedule concise drops={data.dates.map((date, index) => ({ date, number: index + 1 }))}/></div></section>
        <p className="support-copy">{t("packageSupport")}</p>
        <div className="plan-total"><strong>{t("totalDrops", { count: numeral(data.drops) })}</strong><b>{money(data.pricePaise)}</b></div>
        <Button className="wide" to={"/packages/" + slug + "/checkout"}>{t("choosePackage")}</Button>
      </div>
    </div>
  </section>;
}

export function MyPackages() {
  const orders = useApi("/orders");
  const { t, tx } = useI18n();
  const plans = orders.data?.items.filter(order => order.planId && order.paymentStatus === "paid");
  return <section className="page narrow">
    <Title back="/account">{t("myPackages")}</Title>
    {plans ? plans.length ? <div className="order-list">{plans.map(order => <Link className="action-row panel" to={"/orders/" + order.orderRef + "/package"} key={order.orderRef}>
      <Icon name="box" size={28}/><span><strong>{tx(order.lines[0].name)}</strong><small>{order.orderRef} · {t("deliveredOf", { done: numeral(order.drops.filter(drop => drop.state === "delivered").length), total: numeral(order.drops.length) })}</small></span><Icon name="chevron" size={18}/>
    </Link>)}</div> : <Empty title={t("noPackages")} to="/packages" action={t("explorePackages")}/> : <LoadState query={orders}/>}
  </section>;
}

export function ManagePackage() {
  const { t, tx } = useI18n();
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
  if (!data.planId || data.paymentStatus !== "paid") return <section className="page narrow"><Empty title={t("packageUnavailable")} to="/account/packages" action={t("myPackages")}/></section>;
  const delivered = data.drops.filter(drop => drop.state === "delivered").length;
  const next = data.drops.find(drop => drop.state !== "delivered");
  const editable = data.drops.find(drop => drop.number > 1 && drop.state === "upcoming");
  const address = editable?.address || data.address;
  function change(newAddress) {
    action.run(async () => {
      await request("/orders/" + data.orderRef + "/package-address", { method: "PUT", body: { address: newAddress } });
      order.reload();
      done();
      announce(t("addressUpdated"));
    });
  }
  return <section className="page narrow order-page">
    <Title back={editing ? "/orders/" + ref + "/package" : "/account/packages"}>{editing ? t("packageAddress") : t("myPackage")}</Title>
    {editing && editable ? <>
      <p className="support-copy">{t("upcomingAddress")}</p>
      <AddressForm initial={address} action={action} onSubmit={change} submitLabel={t("updateAddress")}/>
    </> : <>
      <div className="panel package-progress">
        <div className="action-row"><Icon name="box" size={31}/><span><strong>{tx(data.lines[0].name)}</strong><small>{t("scheduledDrops", { count: numeral(data.drops.length) })}</small></span><span className="badge">{next ? t("inProgress") : t("completed")}</span></div>
        <label htmlFor="package-progress">{t("deliveriesOf", { done: numeral(delivered), total: numeral(data.drops.length) })}</label>
        <progress id="package-progress" value={delivered} max={data.drops.length}/>
      </div>
      {next && <Notice icon="truck"><strong>{t("nextDrop", { date: dateLabel(next.date) })}</strong><span>{t("dropOf", { number: numeral(next.number), total: numeral(data.drops.length) })}</span></Notice>}
      <section className="order-section"><h2>{t("deliverySchedule")}</h2><DropSchedule drops={data.drops}/></section>
      {editable && <button type="button" className="action-row panel action-button" onClick={edit}>
        <Icon name="pin"/><span><strong>{t("manageAddress")}</strong><small>{addressText(address, t("kolkata"))}</small></span><Icon name="chevron" size={18}/>
      </button>}
      <Link className="action-row panel" to={"/packages/" + data.planId}><Icon name="refresh"/><span><strong>{t("renewPackage")}</strong><small>{t("renewHint")}</small></span><Icon name="chevron" size={18}/></Link>
    </>}
  </section>;
}
