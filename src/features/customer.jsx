import React, { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, LoadState, Notice, Title } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, money, numeral } from "../shared/format";
import { useI18n } from "../shared/i18n";
import { useStore } from "../shared/store";
import { AddressForm, addressText } from "./checkout";
import { Timeline } from "./orders";

function AccountBanner({ title, intro, back }) {
  return <div className="account-banner"><Title back={back} intro={intro}>{title}</Title></div>;
}

function AccountLink({ icon, to, children }) {
  return <Link className="action-row" to={to}><Icon name={icon}/><span>{children}</span><Icon name="chevron" size={18}/></Link>;
}

export function Account() {
  const { t } = useI18n();
  const { buyer, setIdentity } = useStore();
  const action = useAction();
  function signOut() {
    action.run(async () => {
      const session = await request("/auth/logout", { method: "POST" });
      setIdentity(session);
    });
  }
  return <section className="page narrow account-page">
    <AccountBanner title={t("myAccountTitle")}/>
    {buyer?.verified ? <>
      <div className="account-person"><span className="avatar"><Icon name="user" size={31}/></span><div><h2>{buyer.name || (buyer.account ? t("myProfile") : t("guestCheckout"))}</h2><p>+91 {buyer.phone}</p></div></div>
      <div className="account-links">
        <AccountLink icon="box" to="/orders">{t("myOrders")}</AccountLink>
        <AccountLink icon="pin" to="/account/addresses">{t("savedAddresses")}</AccountLink>
        <AccountLink icon="calendar" to="/account/packages">{t("myPackages")}</AccountLink>
        <AccountLink icon="headset" to="/returns">{t("supportReturns")}</AccountLink>
        {!buyer.account && <AccountLink icon="user" to="/login">{t("signInAccount")}</AccountLink>}
        <button className="action-row action-button sign-out" type="button" disabled={action.busy} onClick={signOut}><Icon name="logout"/><span>{t("signOut")}</span><Icon name="chevron" size={18}/></button>
      </div>
      <ErrorMessage error={action.error}/>
    </> : <div className="account-links">
      <AccountLink icon="user" to="/login">{t("signInMobile")}</AccountLink>
      <AccountLink icon="box" to="/orders">{t("myOrders")}</AccountLink>
      <AccountLink icon="headset" to="/help/tracking">{t("helpAndReturns")}</AccountLink>
    </div>}
  </section>;
}

export function Addresses() {
  const { t, tx } = useI18n();
  const addresses = useApi("/addresses");
  const { buyer, location, announce } = useStore();
  const [editing, setEditing] = useState(null);
  const action = useAction();
  function edit(entry) {
    action.setError(null);
    setEditing(entry);
  }
  function save(address, _save, isDefault) {
    action.run(async () => {
      await request("/addresses" + (editing.id ? "/" + editing.id : ""), {
        method: editing.id ? "PUT" : "POST", body: { ...address, isDefault }
      });
      addresses.reload();
      setEditing(null);
      announce(t("addressSaved"));
    });
  }
  function remove(id) {
    action.run(async () => {
      await request("/addresses/" + id, { method: "DELETE" });
      addresses.reload();
      setEditing(null);
      announce(t("addressRemoved"));
    });
  }
  const initial = { phone: buyer.phone, name: buyer.name, pin: location?.pin, locality: location?.locality };
  return <section className="page narrow order-page">
    <AccountBanner title={t("savedAddresses")} intro={t("addressIntro")} back="/account"/>
    {editing ? <div className="panel address-panel">
      <h2>{editing.id ? t("editAddress") : t("addAddressTitle")}</h2>
      <AddressForm initial={editing} action={action} onSubmit={save} editLabel submitLabel={t("saveAddressBtn")}>
        <Button className="wide" secondary onClick={() => edit(null)}>{t("cancel")}</Button>
        {editing.id && <button type="button" className="text-button danger" disabled={action.busy} onClick={() => remove(editing.id)}>{t("removeAddress")}</button>}
      </AddressForm>
    </div> : addresses.data ? <>
      {addresses.data.items.length ? <div className="address-list">{addresses.data.items.map(address =>
        <article className="panel address-panel" key={address.id}>
          <div className="action-row"><Icon name={address.label.toLowerCase() === "home" ? "home" : "pin"}/><h2>{tx(address.label)}</h2>{address.isDefault && <span className="badge">{t("defaultBadge")}</span>}</div>
          <p><strong>{address.name}</strong><br/>{addressText(address, t("kolkata"))}<br/>+91 {address.phone}</p>
          <button className="text-button" type="button" onClick={() => edit(address)}><Icon name="edit" size={17}/> {t("edit")} <span className="sr-only">{tx(address.label)}</span></button>
        </article>
      )}</div> : <Empty title={t("noAddresses")}/>}
      <Button className="wide" icon="plus" onClick={() => edit(initial)}>{t("addAddress")}</Button>
    </> : <LoadState query={addresses} kind="list"/>}
  </section>;
}

const reasons = [
  ["damaged", "reasonDamaged"], ["wrong", "reasonWrong"],
  ["missing", "reasonMissing"], ["other", "reasonOther"]
];

function fileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not open that photo."));
    reader.readAsDataURL(file);
  });
}

async function readPhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose JPEG, PNG or WebP photos.");
  if (file.size < 790_000) return fileData(file);
  if (file.size > 15_000_000) throw new Error("Choose photos under 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const resize = Math.min(1, 1150 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * resize));
    canvas.height = Math.max(1, Math.round(bitmap.height * resize));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    bitmap.close();
  }
}

export function Returns() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orders = useApi("/orders");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState(params.get("order") || "");
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const files = useRef(null);
  const action = useAction();
  const options = orders.data?.items.filter(order => order.paymentStatus === "paid");
  const selection = options?.find(order => order.orderRef === ref);
  async function upload(event) {
    const files = Array.from(event.currentTarget.files);
    event.currentTarget.value = "";
    if (!files.length) return;
    setPhotoError("");
    if (files.length + photos.length > 5) { setPhotoError(t("photoLimit")); return; }
    setProcessing(true);
    try {
      const added = await Promise.all(files.map(readPhoto));
      if (added.some(photo => photo.length > 1_100_000)) throw new Error(t("photoSmaller"));
      setPhotos(previous => [...previous, ...added]);
    } catch (error) {
      setPhotoError(error.message);
    } finally {
      setProcessing(false);
    }
  }
  function submit(event) {
    event.preventDefault();
    if (!selection) { action.setError(new Error(t("selectPaid"))); return; }
    if (reason === "damaged" && !photos.length) { setPhotoError(t("damagedPhoto")); return; }
    const form = new FormData(event.currentTarget);
    action.run(async () => {
      const result = await request("/returns", { method: "POST", body: { orderRef: ref, reason, photos, detail: form.get("detail") } });
      navigate("/refunds/" + result.requestRef);
    });
  }

  return <section className="page narrow order-page">
    <AccountBanner title={t("helpAndReturns")} intro={t("returnsIntro")} back="/account"/>
    {!options ? <LoadState query={orders} kind="list"/> : !options.length ? <Empty title={t("noPaid")} to="/orders" action={t("myOrders")}>{t("choosePaidHint")}</Empty> :
      <form className="stack" onSubmit={submit}>
        <label>{t("selectOrder")}
          <select value={selection?.orderRef || ""} required onChange={event => { setRef(event.target.value); action.setError(null); }}>
            <option value="">{t("choosePaid")}</option>
            {options.map(order => <option key={order.orderRef} value={order.orderRef}>{order.orderRef} · {money(order.totalPaise)} · {dateLabel(order.placedAt)}</option>)}
          </select>
        </label>
        {selection?.returnRef ? <Button className="wide" to={"/refunds/" + selection.returnRef}>{t("viewRefund")}</Button> : <>
          <fieldset><legend>{t("reasonLegend")}</legend>
            {reasons.map(([value, label]) => <label key={value} className="check-line"><input required type="radio" name="reason" value={value}
              checked={reason === value} onChange={() => { setReason(value); setPhotoError(""); }}/>{t(label)}</label>)}
          </fieldset>
          <label>{t("extraDetails")} <textarea name="detail" rows={2} maxLength={500} placeholder={t("optional")}/></label>
          <fieldset><legend>{t("uploadPhotos")} <small>{t("maxPhotos")}</small></legend>
            <div className="photo-grid">
              {photos.map((photo, index) => <div key={index} className="photo-preview"><img src={photo} alt={t("returnPhoto", { index: numeral(index + 1) })}/>
                <button type="button" className="icon-button" aria-label={t("removePhoto", { index: numeral(index + 1) })} onClick={() => setPhotos(previous => previous.filter((_, position) => position !== index))}><Icon name="close" size={15}/></button>
              </div>)}
              {photos.length < 5 && <button className="camera-box" type="button" disabled={processing} onClick={() => files.current?.click()}><Icon name="camera"/>{processing ? t("reading") : t("addPhoto")}</button>}
            </div>
            <input ref={files} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={upload}/>
            <ErrorMessage error={photoError}/>
          </fieldset>
          <div className="stack refund-method"><strong>{t("refundMethod")}</strong><div className="panel">{t("originalMethod")}</div></div>
          <ErrorMessage error={action.error}/>
          <Button className="wide" type="submit" disabled={action.busy || processing}>{action.busy ? t("submitting") : t("submitRequest")}</Button>
        </>}
      </form>}
  </section>;
}

const refundLabels = {
  requested: ["requestReceived", "requestReceivedCopy"],
  under_review: ["underReview", "underReviewCopy"],
  initiated: ["refundInitiated", "refundInitiatedCopy"],
  processed: ["refundProcessed", "refundProcessedCopy"]
};

export function Refund() {
  const { t, tx } = useI18n();
  const { ref } = useParams();
  const refund = useApi("/returns/" + encodeURIComponent(ref));
  const data = refund.data;
  if (!data) return <section className="page narrow"><LoadState query={refund}/></section>;
  const [title, description] = refundLabels[data.status];
  return <section className="page narrow order-page refund-page">
    <AccountBanner title={t("refundStatus")} intro={t("refundIntro")} back={"/orders/" + data.orderRef}/>
    <Notice icon={data.status === "requested" ? "info" : "check"}><strong>{t(title)}</strong><span>{t(description)}</span></Notice>
    <div className="panel refund-summary">
      <h2>{t("requestDetails")}</h2>
      <dl className="totals">
        <div><dt>{t("requestId")}</dt><dd>{data.requestRef}</dd></div>
        <div><dt>{t("order")}</dt><dd>{data.orderRef}</dd></div>
        <div><dt>{t("refundAmount")}</dt><dd>{data.refundAmountPaise == null ? t("pendingReview") : money(data.refundAmountPaise)}</dd></div>
        <div><dt>{t("refundMethodLabel")}</dt><dd>{tx(data.refundMethod)}</dd></div>
        {data.photoCount > 0 && <div><dt>{t("evidence")}</dt><dd>{t("photoCount", { count: numeral(data.photoCount) })}</dd></div>}
      </dl>
    </div>
    <section className="order-section"><h2>{t("requestTimeline")}</h2><Timeline entries={data.timeline}/></section>
    <Button secondary className="wide" icon="refresh" onClick={refund.reload}>{t("refreshStatus")}</Button>
  </section>;
}
