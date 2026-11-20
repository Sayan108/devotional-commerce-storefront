import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, LoadState, Notice, Photo, Stepper, Title, Totals } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { assetUrl } from "../env.ts";
import { artwork, money, numeral } from "../shared/format";
import { HeroMotion } from "../shared/heroMotion";
import { useI18n } from "../shared/i18n";
import { useBagCatalog, useStore } from "../shared/store";

const tagKeys = [["brass", "tagBrass"], ["terracotta", "tagTerracotta"], ["hanging", "tagHanging"], ["panchapradip", "tagPancha"]];
const sortKeys = [["", "sortPopular"], ["price-asc", "sortLow"], ["price-desc", "sortHigh"], ["name", "sortName"]];
const examples = [["Brass lamp", "exampleBrass"], ["Puja lamp", "examplePuja"], ["Chandan", "exampleChandan"], ["Cotton wicks", "exampleWicks"], ["Arati", "exampleArati"]];

function categoryLink(slug) {
  return slug === "packages" ? "/packages" : "/collections/" + slug;
}

function Heart({ product }) {
  const { saved, toggleSaved } = useStore();
  const { t, tx } = useI18n();
  const selected = saved.includes(product.id);
  const name = tx(product.name);
  return <button type="button" className={"icon-button save-button" + (selected ? " saved" : "")}
    aria-label={t(selected ? "unsaveItem" : "saveItem", { name })} aria-pressed={selected}
    onClick={() => toggleSaved(product.id)}><Icon name="heart" size={22} filled={selected}/></button>;
}

export function ProductCard({ product, compact = false, horizontal = false }) {
  const { add } = useStore();
  const { t, tx } = useI18n();
  const variant = product.variants[0];
  const to = "/products/" + product.slug;
  const name = tx(product.name);
  return <article className={"product-card" + (compact ? " compact" : "") + (horizontal ? " horizontal" : "")}>
    <Link className="product-photo" to={to} aria-label={name}><Photo src={assetUrl(product.image)} alt="" loading="lazy"/></Link>
    <div className="product-card-copy">
      <h3><Link to={to}>{name}{variant.packSize !== "1 pc" && <small> ({tx(variant.packSize)})</small>}</Link></h3>
      <strong className="card-price">{money(variant.pricePaise)}</strong>
      {!compact && (variant.stock > 0 ?
        <Button icon="cart" onClick={() => add(product, variant)}>{t("addToCart")}</Button> :
        <span className="sold-out">{t("soldOut")}</span>)}
    </div>
    <Heart product={product}/>
  </article>;
}

const SectionLink = ({ to, children }) => <Link className="section-link" to={to}>{children}<Icon name="chevron" size={16}/></Link>;

export function Home() {
  const home = useApi("/home");
  const { location } = useStore();
  const { t, tx } = useI18n();
  const poster = assetUrl(home.data?.hero?.poster || "/media/hero-lamp.jpg");
  const place = location?.locality ? tx(location.locality) : t("kolkata");
  return <>
    <div className="delivery-bar"><Link to="/delivery"><Icon name="pin" size={20} filled/><span>{t("deliverTo", { place })}</span><Icon name="down" size={16}/></Link></div>
    <section className="home-hero">
      <picture>
        <source media="(min-width: 760px)" srcSet="/artwork/morning.webp"/>
        <img src={poster} alt={t("heroAlt")} fetchPriority="high"/>
      </picture>
      <HeroMotion/>
      <div className="home-hero-copy"><h1>{t("heroHeadline")}</h1><Button to="/shop">{t("heroCta")}<Icon name="chevron" size={17}/></Button></div>
    </section>
    <div className="page home-sections">
      {home.data ? <>
        <section aria-labelledby="home-categories">
          <div className="section-title"><h2 id="home-categories">{t("shopByCategory")}</h2><SectionLink to="/categories">{t("viewAll")}</SectionLink></div>
          <div className="category-tiles">{home.data.collections.map(category =>
            <Link to={categoryLink(category.slug)} key={category.slug}><img src={assetUrl(category.thumbnail)} alt=""/><span>{tx(category.name)}</span></Link>
          )}</div>
        </section>
        <section aria-labelledby="home-popular">
          <div className="section-title"><h2 id="home-popular">{t("popular")}</h2><SectionLink to="/shop">{t("viewAll")}</SectionLink></div>
          <div className="popular-grid">{home.data.items.map(product => <ProductCard key={product.id} product={product} compact/>)}</div>
        </section>
        <section className="house-package">
          <img src={artwork("package-hero")} alt={t("packageAlt")} loading="lazy"/>
          <div><h2>{t("pujaPackages")}</h2><p>{t("packageBlurb")}</p><Button to="/packages">{t("explorePackages")}</Button></div>
        </section>
      </> : <LoadState query={home} kind="home"/>}
    </div>
  </>;
}

export function Categories() {
  const listing = useApi("/collections");
  const { t, tx } = useI18n();
  return <section className="page">
    <Title>{t("allCategories")}</Title>
    {listing.data ? <div className="category-grid">{listing.data.items.map(category =>
      <Link to={categoryLink(category.slug)} key={category.slug} className="category-card"><img src={assetUrl(category.image)} alt="" loading="lazy"/><strong>{tx(category.name)} <Icon name="chevron" size={18}/></strong></Link>
    )}</div> : <LoadState query={listing} kind="categories"/>}
  </section>;
}

function FilterDialog({ close, apply, params, collections, fixedCategory }) {
  const { t, tx } = useI18n();
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    apply({
      category: data.getAll("category").join(","),
      inStock: data.has("inStock") ? "1" : "",
      min: data.get("min"),
      max: data.get("max"),
      sort: data.get("sort")
    });
    close();
  }
  return <dialog ref={dialog} className="filter-dialog" onClose={close} aria-labelledby="filter-title"
    onClick={event => { if (event.target === dialog.current) close(); }}>
    <form onSubmit={submit}>
      <div className="sheet-handle"/>
      <div className="section-title"><h2 id="filter-title">{t("filterSort")}</h2><button type="button" className="icon-button" onClick={close} aria-label={t("closeFilters")}><Icon name="close"/></button></div>
      {!fixedCategory && <fieldset><legend>{t("category")}</legend>{collections.filter(entry => entry.slug !== "packages").map(category =>
        <label className="check-line" key={category.slug}><input type="checkbox" name="category" value={category.slug}
          defaultChecked={params.get("category")?.split(",").includes(category.slug)}/>{tx(category.name)}</label>
      )}</fieldset>}
      <label className="check-line stock-filter">{t("inStockOnly")}<input name="inStock" type="checkbox" role="switch" defaultChecked={params.get("inStock") === "1"}/></label>
      <fieldset><legend>{t("priceRange")}</legend><div className="price-range">
        <label>{t("minimum")}<input name="min" type="number" min="0" placeholder="0" defaultValue={params.get("min") || ""}/></label>
        <label>{t("maximum")}<input name="max" type="number" min="0" placeholder="1,500" defaultValue={params.get("max") || ""}/></label>
      </div></fieldset>
      <label className="sort-field">{t("sortBy")}<select name="sort" defaultValue={params.get("sort") || ""}>{sortKeys.map(([id, label]) => <option value={id} key={label}>{t(label)}</option>)}</select></label>
      <Button type="submit" className="wide">{t("applyFilters")}</Button>
    </form>
  </dialog>;
}

export function Shop() {
  const { t, tx } = useI18n();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState(false);
  const collections = useApi("/collections");
  const outgoing = new URLSearchParams(params);
  if (slug) outgoing.set("category", slug);
  const listing = useApi("/products?" + outgoing.toString());
  const category = collections.data?.items.find(item => item.slug === slug);
  const patchFilters = changes => {
    const updated = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => value ? updated.set(key, value) : updated.delete(key));
    setParams(updated);
  };
  if (slug && collections.data && !category) return <section className="page"><Empty title={t("categoryUnavailable")} to="/categories" action={t("browseCategories")}/></section>;
  return <section className="page shop-page">
    <Title back={slug ? "/categories" : undefined}>{category ? tx(category.name) : t("pujaEssentials")}</Title>
    <div className="shop-controls">
      <button type="button" className="control-button" onClick={() => setFilter(true)}><Icon name="filter" size={19}/> {t("filter")}</button>
      <label className="sort-control"><span>{t("sortLabel")}</span><select aria-label={t("sortProducts")} value={params.get("sort") || ""} onChange={event => patchFilters({ sort: event.target.value })}>
        {sortKeys.map(([id, label]) => <option value={id} key={label}>{t(label)}</option>)}
      </select></label>
      {params.size > 0 && <button type="button" className="text-button" onClick={() => setParams({})}>{t("clearFilters")}</button>}
    </div>
    {slug === "lamps" && <div className="chips">{tagKeys.map(([id, label]) =>
      <button type="button" className="chip" aria-pressed={params.get("tag") === id} key={id}
        onClick={() => patchFilters({ tag: params.get("tag") === id ? "" : id })}>{t(label)}</button>
    )}</div>}
    {listing.data ? (listing.data.items.length ?
      <div className="product-grid">{listing.data.items.map(product => <ProductCard product={product} key={product.id}/>)}</div> :
      <Empty title={t("noFilterMatch")}><button className="text-button" type="button" onClick={() => setParams({})}>{t("clearFilters")}</button></Empty>
    ) : <LoadState query={listing} kind="products"/>}
    {filter && <FilterDialog apply={patchFilters} params={params} close={() => setFilter(false)} fixedCategory={slug} collections={collections.data?.items || []}/>}
  </section>;
}

export function Search() {
  const { t, tx } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [draft, setDraft] = useState(q);
  const input = useRef(null);
  useEffect(() => { setDraft(q); }, [q]);
  useEffect(() => {
    if (draft.trim() === q) return;
    const timer = setTimeout(() => setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true }), 250);
    return () => clearTimeout(timer);
  }, [draft, q, setParams]);
  const search = useApi(q ? "/products?q=" + encodeURIComponent(q) : null);
  const commit = value => { setDraft(value); setParams(value ? { q: value } : {}); };
  return <section className="page search-page">
    <h1 className="sr-only">{t("searchProducts")}</h1>
    <form role="search" className="search-field" onSubmit={event => { event.preventDefault(); commit(draft.trim()); }}>
      <button type="submit" className="icon-button" aria-label={t("search")}><Icon name="search"/></button>
      <input ref={input} name="q" aria-label={t("searchProducts")} placeholder={t("searchPlaceholder")} value={draft} maxLength={100} onChange={event => setDraft(event.target.value)}/>
      {draft && <button type="button" className="icon-button" aria-label={t("clearSearch")} onClick={() => { commit(""); input.current.focus(); }}><Icon name="close"/></button>}
    </form>
    {q && search.data ? <>
      {search.data.suggestions.length > 0 && <ul className="suggestions">{search.data.suggestions.map(term =>
        <li key={term}><button type="button" onClick={() => commit(term)}><Icon name="search" size={18}/> {tx(term)}</button></li>
      )}</ul>}
      {search.data.items.length ? <section>
        <div className="section-title"><h2>{t("productsFor", { query: tx(q) })}</h2></div>
        <div className="search-results">{search.data.items.map(product => <ProductCard product={product} key={product.id} horizontal/>)}</div>
      </section> : <EmptySearch q={q} commit={commit}/>}
    </> : q ? <LoadState query={search} kind="search"/> : <EmptySearch commit={commit}/>}
  </section>;
}

function EmptySearch({ q, commit }) {
  const { t, tx } = useI18n();
  return <div className="empty-search">
    <img src={artwork("empty-search")} alt=""/>
    {q && <><h2>{t("noResults", { query: tx(q) })}</h2><p>{t("tryAnother")}</p></>}
    <h3>{t("trySearching")}</h3>
    <div className="chips">{examples.map(([term, key]) => <button type="button" className="chip" key={key} onClick={() => commit(term)}>{t(key)}</button>)}</div>
    <Button to="/categories" icon="grid" className="wide">{t("browseCategories")}</Button>
  </div>;
}

export function Product() {
  const { slug } = useParams();
  const product = useApi("/products/" + encodeURIComponent(slug));
  return <section className="page product-page">
    {product.data ? <ProductDetail key={slug} product={product.data}/> : <LoadState query={product} kind="product"/>}
  </section>;
}

function ProductDetail({ product }) {
  const { add, location } = useStore();
  const { t, tx, lang } = useI18n();
  const [variantId, setVariant] = useState(product.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const selected = product.variants.find(variant => variant.id === variantId);
  const name = tx(product.name);
  return <div className="product-detail">
    <div className="detail-photo"><Photo src={assetUrl(product.image)} alt={name}/></div>
    <div className="detail-info">
      <div className="detail-heading">
        <div><h1>{name}</h1><strong>{money(selected.pricePaise)}</strong></div><Heart product={product}/>
      </div>
      <div className="detail-attributes">
        <label><span><Icon name="box"/> {t("packSize")}</span><select value={variantId} onChange={event => { setVariant(event.target.value); setQuantity(1); }}>
          {product.variants.map(variant => <option key={variant.id} value={variant.id}>{tx(variant.packSize)}{variant.stock === 0 && " · " + t("soldOut")}</option>)}
        </select></label>
        <div><span><Icon name="layers"/> {t("material")}</span><span>{tx(product.material)}</span></div>
      </div>
      <div className="quantity-row"><span>{t("quantity")}</span><Stepper value={quantity} onChange={setQuantity} max={Math.min(10, selected.stock)}/></div>
      <Button className="wide" icon="bag" disabled={!selected.stock} onClick={() => add(product, selected, quantity)}>{selected.stock ? t("addToBag") : t("soldOut")}</Button>
      <Link className="inline-delivery" to={"/delivery?next=" + encodeURIComponent("/products/" + product.slug)}><Icon name="truck" size={20}/>{location ? t("deliveringTo", { place: tx(location.locality), pin: location.pin }) : t("checkAvailability")}</Link>
      {product.description && <p className="product-description">{tx(product.description)}</p>}
      {lang === "en" && product.bengali && <p className="bengali" lang="bn">{product.bengali}</p>}
    </div>
  </div>;
}

export function Wishlist() {
  const { saved, toggleSaved, add } = useStore();
  const { t, tx } = useI18n();
  const listing = useApi(saved.length ? "/products" : null);
  const products = listing.data?.items.filter(product => saved.includes(product.id)) || [];
  return <section className="page narrow">
    <Title intro={t("itemCount", { count: numeral(saved.length) })}>{t("savedItems")}</Title>
    {!saved.length ? <Empty title={t("nothingSaved")} to="/shop" action={t("heroCta")}>{t("saveHint")}</Empty> :
      listing.data ? <div className="saved-list">{products.map(product => {
        const variant = product.variants[0];
        const name = tx(product.name);
        return <article className="saved-row" key={product.id}>
          <Link to={"/products/" + product.slug}><img src={assetUrl(product.image)} alt={name}/></Link>
          <div><h2><Link to={"/products/" + product.slug}>{name}</Link></h2>
            {variant.packSize !== "1 pc" && <small>{tx(variant.packSize)}</small>}<strong>{money(variant.pricePaise)}</strong>
            <Button secondary icon="bag" disabled={!variant.stock} onClick={() => { if (add(product, variant)) toggleSaved(product.id); }}>{variant.stock ? t("moveToBag") : t("soldOut")}</Button>
          </div>
          <button type="button" className="icon-button remove-button" aria-label={t("removeNamed", { name })} onClick={() => toggleSaved(product.id)}><Icon name="close" size={19}/></button>
        </article>;
      })}</div> : <LoadState query={listing} kind="list"/>}
  </section>;
}

export function Bag() {
  const { updateQuantity, location } = useStore();
  const { t, tx } = useI18n();
  const listing = useBagCatalog();
  const { lines, legacy } = listing;
  const invalid = lines.some(line => !line.variant || line.quantity > line.variant.stock);
  const subtotalPaise = lines.reduce((sum, line) => sum + (line.variant?.pricePaise || 0) * line.quantity, 0);
  const deliveryPaise = subtotalPaise && subtotalPaise < 50000 ? 3000 : 0;
  const estimate = { subtotalPaise, deliveryPaise, totalPaise: subtotalPaise + deliveryPaise };
  const count = lines.reduce((total, line) => total + line.quantity, 0) + (legacy ? 1 : 0);
  return <section className="page">
    <Title intro={t("itemCount", { count: numeral(count) })}>{t("shoppingBag")}</Title>
    {legacy && <div className="legacy-plan"><Button secondary to={"/packages/" + encodeURIComponent(legacy.id) + "/checkout"}>{t("checkoutSaved")}</Button><button className="text-button" type="button" onClick={() => updateQuantity(legacy.id, 0)}>{t("removePackage")}</button></div>}
    {!lines.length ? <Empty title={legacy ? t("individualItems") : t("bagEmpty")} to="/shop" action={t("heroCta")}/> : !listing.data ? <LoadState query={listing} kind="list"/> :
      <div className="two-column bag-layout">
        <div className="bag-items">{lines.map(({ id, quantity, product, variant }) => {
          const name = product ? tx(product.name) : t("item");
          return <article className="bag-row" key={id}>
            {product ? <Link to={"/products/" + product.slug}><img src={assetUrl(product.image)} alt={name}/></Link> : <span className="missing-photo"><Icon name="box"/></span>}
            <div><h2>{product ? <Link to={"/products/" + product.slug}>{name}</Link> : t("unavailableItem")}</h2>
              {variant && <><small>{tx(variant.packSize)}</small><strong>{money(variant.pricePaise * quantity)}</strong></>}
              {(!variant || quantity > variant.stock) && <p className="form-error">{variant?.stock ? t("onlyAvailable", { count: numeral(variant.stock) }) : t("itemUnavailable")}</p>}
              {variant && <Stepper label={t("itemQuantity", { name })} value={quantity} onChange={value => updateQuantity(id, value)} max={Math.min(10, variant.stock)}/>}
            </div>
            <button type="button" className="icon-button remove-button" aria-label={t("removeNamed", { name })} onClick={() => updateQuantity(id, 0)}><Icon name="close" size={19}/></button>
          </article>;
        })}</div>
        <aside className="checkout-summary">
          <Link className="inline-delivery" to="/delivery?next=%2Fbag"><Icon name="truck" size={21}/>{location ? t("deliverTo", { place: tx(location.locality) }) : t("checkAvailability")}</Link>
          <Totals value={estimate}/>
          {invalid ? <Button disabled className="wide" icon="lock">{t("checkout")}</Button> : <Button to="/checkout" className="wide" icon="lock">{t("checkout")}</Button>}
        </aside>
      </div>}
  </section>;
}

export function Delivery() {
  const { t, tx } = useI18n();
  const navigate = useNavigate();
  const { location, setLocation } = useStore();
  const [pin, setPin] = useState(location?.pin || "");
  const [result, setResult] = useState(null);
  const { run, error, busy, setError } = useAction();
  const [params] = useSearchParams();
  const next = params.get("next");
  const back = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
  const input = useRef(null);
  const edit = clear => {
    setResult(null);
    setError(null);
    if (clear) setPin("");
    requestAnimationFrame(() => input.current?.focus());
  };
  const submit = event => {
    event.preventDefault();
    if (result?.eligible) {
      setLocation({ pin, locality: result.locality });
      navigate(back);
      return;
    }
    run(async () => setResult(await request("/serviceability", { method: "POST", body: { pin } })));
  };
  return <section className="page narrow pin-page">
    {result && !result.eligible ? <div className="status-page">
      <img className="exception-art" src={artwork("pin-unavailable")} alt=""/>
      <Title>{t("deliveryPaused")}</Title>
      <p role="status">{tx(result.message)} {t("tryAnotherPin")}</p>
      <Button secondary icon="edit" className="wide" onClick={() => edit(false)}>{t("editPin", { pin })}</Button>
      <Button icon="pin" className="wide" onClick={() => edit(true)}>{t("tryAnotherAddress")}</Button>
    </div> : <>
      <img className="page-art pin-art" src={artwork("pin-hero")} alt=""/>
      <div className="pin-form">
        <Title back={back} intro={t("pinIntro")}>{t("checkAvailability")}</Title>
        <form className="stack" onSubmit={submit}>
          <label>{t("pinLabel")}<input ref={input} autoComplete="postal-code" required value={pin} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} onChange={event => { setPin(event.target.value.replace(/\D/g, "")); setResult(null); }}/></label>
          {result?.eligible && <Notice icon="truck"><strong>{t("deliveryDay")}</strong><span role="status">{tx(result.locality)}, {t("kolkata")} · {pin}</span></Notice>}
          <ErrorMessage error={error}/>
          <Button className="wide" type="submit" disabled={busy}>{busy ? t("checking") : result?.eligible ? t("confirmLocation") : t("checkPin")}</Button>
        </form>
      </div>
    </>}
  </section>;
}
