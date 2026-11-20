import React, { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, LoadState, Notice, Title } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { dateLabel, money, plural } from "../shared/format";
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
  const { buyer, setIdentity } = useStore();
  const action = useAction();
  function signOut() {
    action.run(async () => {
      const session = await request("/auth/logout", { method: "POST" });
      setIdentity(session);
    });
  }
  return <section className="page narrow account-page">
    <AccountBanner title="My Account"/>
    {buyer?.verified ? <>
      <div className="account-person"><span className="avatar"><Icon name="user" size={31}/></span><div><h2>{buyer.name || (buyer.account ? "My profile" : "Guest checkout")}</h2><p>+91 {buyer.phone}</p></div></div>
      <div className="account-links">
        <AccountLink icon="box" to="/orders">My Orders</AccountLink>
        <AccountLink icon="pin" to="/account/addresses">Saved Addresses</AccountLink>
        <AccountLink icon="calendar" to="/account/packages">My Packages</AccountLink>
        <AccountLink icon="headset" to="/returns">Support (Help &amp; Returns)</AccountLink>
        {!buyer.account && <AccountLink icon="user" to="/login">Sign in to your account</AccountLink>}
        <button className="action-row action-button sign-out" type="button" disabled={action.busy} onClick={signOut}><Icon name="logout"/><span>Sign Out</span><Icon name="chevron" size={18}/></button>
      </div>
      <ErrorMessage error={action.error}/>
    </> : <div className="account-links">
      <AccountLink icon="user" to="/login">Sign in with your mobile number</AccountLink>
      <AccountLink icon="box" to="/orders">My Orders</AccountLink>
      <AccountLink icon="headset" to="/help/tracking">Help &amp; Returns</AccountLink>
    </div>}
  </section>;
}

export function Addresses() {
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
      announce("Address saved.");
    });
  }
  function remove(id) {
    action.run(async () => {
      await request("/addresses/" + id, { method: "DELETE" });
      addresses.reload();
      setEditing(null);
      announce("Address removed.");
    });
  }
  const initial = { phone: buyer.phone, name: buyer.name, pin: location?.pin, locality: location?.locality };
  return <section className="page narrow order-page">
    <AccountBanner title="Saved Addresses" intro="Manage your delivery addresses." back="/account"/>
    {editing ? <div className="panel address-panel">
      <h2>{editing.id ? "Edit address" : "Add address"}</h2>
      <AddressForm initial={editing} action={action} onSubmit={save} editLabel submitLabel="Save address">
        <Button className="wide" secondary onClick={() => edit(null)}>Cancel</Button>
        {editing.id && <button type="button" className="text-button danger" disabled={action.busy} onClick={() => remove(editing.id)}>Remove this address</button>}
      </AddressForm>
    </div> : addresses.data ? <>
      {addresses.data.items.length ? <div className="address-list">{addresses.data.items.map(address =>
        <article className="panel address-panel" key={address.id}>
          <div className="action-row"><Icon name={address.label.toLowerCase() === "home" ? "home" : "pin"}/><h2>{address.label}</h2>{address.isDefault && <span className="badge">Default</span>}</div>
          <p><strong>{address.name}</strong><br/>{addressText(address)}<br/>+91 {address.phone}</p>
          <button className="text-button" type="button" onClick={() => edit(address)}><Icon name="edit" size={17}/> Edit <span className="sr-only">{address.label}</span></button>
        </article>
      )}</div> : <Empty title="No saved addresses"/>}
      <Button className="wide" icon="plus" onClick={() => edit(initial)}>Add Address</Button>
    </> : <LoadState query={addresses}/>}
  </section>;
}

const reasons = [
  ["damaged", "Received a damaged item"], ["wrong", "Received a wrong item"],
  ["missing", "Item is missing from the package"], ["other", "Other"]
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
    if (files.length + photos.length > 5) { setPhotoError("Add up to five photos."); return; }
    setProcessing(true);
    try {
      const added = await Promise.all(files.map(readPhoto));
      if (added.some(photo => photo.length > 1_100_000)) throw new Error("Choose a smaller photo.");
      setPhotos(previous => [...previous, ...added]);
    } catch (error) {
      setPhotoError(error.message);
    } finally {
      setProcessing(false);
    }
  }
  function submit(event) {
    event.preventDefault();
    if (!selection) { action.setError(new Error("Select a paid order.")); return; }
    if (reason === "damaged" && !photos.length) { setPhotoError("Add a photo of the damaged item."); return; }
    const form = new FormData(event.currentTarget);
    action.run(async () => {
      const result = await request("/returns", { method: "POST", body: { orderRef: ref, reason, photos, detail: form.get("detail") } });
      navigate("/refunds/" + result.requestRef);
    });
  }

  return <section className="page narrow order-page">
    <AccountBanner title="Help & Returns" intro="Get help with your order or request a return." back="/account"/>
    {!options ? <LoadState query={orders}/> : !options.length ? <Empty title="No paid orders" to="/orders" action="My orders">Choose a paid order to request a return.</Empty> :
      <form className="stack" onSubmit={submit}>
        <label>Select Order
          <select value={selection?.orderRef || ""} required onChange={event => { setRef(event.target.value); action.setError(null); }}>
            <option value="">Choose a paid order</option>
            {options.map(order => <option key={order.orderRef} value={order.orderRef}>{order.orderRef} · {money(order.totalPaise)} · {dateLabel(order.placedAt)}</option>)}
          </select>
        </label>
        {selection?.returnRef ? <Button className="wide" to={"/refunds/" + selection.returnRef}>View refund status</Button> : <>
          <fieldset><legend>Reason for Return</legend>
            {reasons.map(([value, label]) => <label key={value} className="check-line"><input required type="radio" name="reason" value={value}
              checked={reason === value} onChange={() => { setReason(value); setPhotoError(""); }}/>{label}</label>)}
          </fieldset>
          <label>Extra details <textarea name="detail" rows={2} maxLength={500} placeholder="Optional"/></label>
          <fieldset><legend>Upload Photos <small>(max 5)</small></legend>
            <div className="photo-grid">
              {photos.map((photo, index) => <div key={index} className="photo-preview"><img src={photo} alt={"Return photo " + (index + 1)}/>
                <button type="button" className="icon-button" aria-label={"Remove photo " + (index + 1)} onClick={() => setPhotos(previous => previous.filter((_, position) => position !== index))}><Icon name="close" size={15}/></button>
              </div>)}
              {photos.length < 5 && <button className="camera-box" type="button" disabled={processing} onClick={() => files.current?.click()}><Icon name="camera"/>{processing ? "Reading…" : "Add Photo"}</button>}
            </div>
            <input ref={files} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={upload}/>
            <ErrorMessage error={photoError}/>
          </fieldset>
          <div className="stack refund-method"><strong>Refund Method</strong><div className="panel">Original Payment Method</div></div>
          <ErrorMessage error={action.error}/>
          <Button className="wide" type="submit" disabled={action.busy || processing}>{action.busy ? "Submitting…" : "Submit Request"}</Button>
        </>}
      </form>}
  </section>;
}

const refundLabels = {
  requested: ["Request received", "Your return request is awaiting review."],
  under_review: ["Under review", "The merchant is reviewing your request."],
  initiated: ["Refund initiated", "Your refund has been initiated to your original payment method."],
  processed: ["Refund processed", "Your refund has been marked as processed."]
};

export function Refund() {
  const { ref } = useParams();
  const refund = useApi("/returns/" + encodeURIComponent(ref));
  const data = refund.data;
  if (!data) return <section className="page narrow"><LoadState query={refund}/></section>;
  const [title, description] = refundLabels[data.status];
  return <section className="page narrow order-page refund-page">
    <AccountBanner title="Refund Status" intro="Track the status of your refund request." back={"/orders/" + data.orderRef}/>
    <Notice icon={data.status === "requested" ? "info" : "check"}><strong>{title}</strong><span>{description}</span></Notice>
    <div className="panel refund-summary">
      <h2>Request Details</h2>
      <dl className="totals">
        <div><dt>Request ID</dt><dd>{data.requestRef}</dd></div>
        <div><dt>Order</dt><dd>{data.orderRef}</dd></div>
        <div><dt>Refund amount</dt><dd>{data.refundAmountPaise == null ? "Pending review" : money(data.refundAmountPaise)}</dd></div>
        <div><dt>Refund method</dt><dd>{data.refundMethod}</dd></div>
        {data.photoCount > 0 && <div><dt>Evidence</dt><dd>{plural(data.photoCount, "photo")}</dd></div>}
      </dl>
    </div>
    <section className="order-section"><h2>Request Timeline</h2><Timeline entries={data.timeline}/></section>
    <Button secondary className="wide" icon="refresh" onClick={refund.reload}>Refresh status</Button>
  </section>;
}
