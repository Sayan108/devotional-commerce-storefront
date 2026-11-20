import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Empty, ErrorMessage, Icon, LoadState, Notice, Stepper, Title, Totals } from "../shared/ui";
import { request, useAction, useApi } from "../shared/api";
import { artwork, money, plural } from "../shared/format";
import { useBagCatalog, useStore } from "../shared/store";

const tags = [["brass", "Brass"], ["terracotta", "Terracotta"], ["hanging", "Hanging"], ["panchapradip", "Panchapradip"]];
const sorts = [["", "Popular"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["name", "Name"]];
const examples = ["Brass lamp", "Puja lamp", "Chandan", "Cotton wicks", "Arati"];

function categoryLink(slug) {
  return slug === "packages" ? "/packages" : "/collections/" + slug;
}

function Heart({ product }) {
  const { saved, toggleSaved } = useStore();
  const selected = saved.includes(product.id);
  return <button type="button" className={"icon-button save-button" + (selected ? " saved" : "")}
    aria-label={(selected ? "Remove from saved items: " : "Save ") + product.name} aria-pressed={selected}
    onClick={() => toggleSaved(product.id)}><Icon name="heart" size={22} filled={selected}/></button>;
}

export function ProductCard({ product, compact = false, horizontal = false }) {
  const { add } = useStore();
  const variant = product.variants[0];
  const to = "/products/" + product.slug;
  return <article className={"product-card" + (compact ? " compact" : "") + (horizontal ? " horizontal" : "")}>
    <Link className="product-photo" to={to} aria-label={product.name}><img src={product.image} alt="" loading="lazy"/></Link>
    <div className="product-card-copy">
      <h3><Link to={to}>{product.name}{variant.packSize !== "1 pc" && <small> ({variant.packSize})</small>}</Link></h3>
      <strong className="card-price">{money(variant.pricePaise)}</strong>
      {!compact && (variant.stock > 0 ?
        <Button icon="cart" onClick={() => add(product, variant)}>Add to cart</Button> :
        <span className="sold-out">Sold out</span>)}
    </div>
    <Heart product={product}/>
  </article>;
}

const SectionLink = ({ to, children }) => <Link className="section-link" to={to}>{children}<Icon name="chevron" size={16}/></Link>;

export function Home() {
  const home = useApi("/home");
  const { location } = useStore();
  const hero = home.data?.hero || { headline: "For the morning puja", cta: "Shop essentials", poster: "/media/hero-lamp.jpg" };
  return <>
    <div className="delivery-bar"><Link to="/delivery"><Icon name="pin" size={20} filled/><span>Deliver to {location?.locality || "Kolkata"}</span><Icon name="down" size={16}/></Link></div>
    <section className="home-hero">
      <picture>
        <source media="(min-width: 760px)" srcSet="/artwork/morning.webp"/>
        <img src={hero.poster} alt="Lit brass lamp beside a red hibiscus and red-bordered cotton cloth" fetchPriority="high"/>
      </picture>
      <div className="home-hero-copy"><h1>{hero.headline}</h1><Button to="/shop">{hero.cta}<Icon name="chevron" size={17}/></Button></div>
    </section>
    <div className="page home-sections">
      {home.data ? <>
        <section aria-labelledby="home-categories">
          <div className="section-title"><h2 id="home-categories">Shop by category</h2><SectionLink to="/categories">View all</SectionLink></div>
          <div className="category-tiles">{home.data.collections.map(category =>
            <Link to={categoryLink(category.slug)} key={category.slug}><img src={category.thumbnail} alt=""/><span>{category.name}</span></Link>
          )}</div>
        </section>
        <section aria-labelledby="home-popular">
          <div className="section-title"><h2 id="home-popular">Popular products</h2><SectionLink to="/shop">View all</SectionLink></div>
          <div className="popular-grid">{home.data.items.map(product => <ProductCard key={product.id} product={product} compact/>)}</div>
        </section>
        <section className="house-package">
          <img src={artwork("package-hero")} alt="Hand-wrapped puja parcel with a red hibiscus" loading="lazy"/>
          <div><h2>Puja Packages</h2><p>Weekly and monthly deliveries of the essentials for your home puja.</p><Button to="/packages">Explore packages</Button></div>
        </section>
      </> : <LoadState query={home}/>}
    </div>
  </>;
}

export function Categories() {
  const listing = useApi("/collections");
  return <section className="page">
    <Title>All Categories</Title>
    {listing.data ? <div className="category-grid">{listing.data.items.map(category =>
      <Link to={categoryLink(category.slug)} key={category.slug} className="category-card"><img src={category.image} alt="" loading="lazy"/><strong>{category.name} <Icon name="chevron" size={18}/></strong></Link>
    )}</div> : <LoadState query={listing}/>}
  </section>;
}

function FilterDialog({ close, apply, params, collections, fixedCategory }) {
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
      <div className="section-title"><h2 id="filter-title">Filter &amp; Sort</h2><button type="button" className="icon-button" onClick={close} aria-label="Close filters"><Icon name="close"/></button></div>
      {!fixedCategory && <fieldset><legend>Category</legend>{collections.filter(entry => entry.slug !== "packages").map(category =>
        <label className="check-line" key={category.slug}><input type="checkbox" name="category" value={category.slug}
          defaultChecked={params.get("category")?.split(",").includes(category.slug)}/>{category.name}</label>
      )}</fieldset>}
      <label className="check-line stock-filter">In stock only<input name="inStock" type="checkbox" role="switch" defaultChecked={params.get("inStock") === "1"}/></label>
      <fieldset><legend>Price range</legend><div className="price-range">
        <label>Minimum (₹)<input name="min" type="number" min="0" placeholder="0" defaultValue={params.get("min") || ""}/></label>
        <label>Maximum (₹)<input name="max" type="number" min="0" placeholder="1,500" defaultValue={params.get("max") || ""}/></label>
      </div></fieldset>
      <label className="sort-field">Sort by<select name="sort" defaultValue={params.get("sort") || ""}>{sorts.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
      <Button type="submit" className="wide">Apply filters</Button>
    </form>
  </dialog>;
}

export function Shop() {
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
  if (slug && collections.data && !category) return <section className="page"><Empty title="Category unavailable" to="/categories" action="Browse categories"/></section>;
  return <section className="page shop-page">
    <Title back={slug ? "/categories" : undefined}>{category?.name || "Puja Essentials"}</Title>
    <div className="shop-controls">
      <button type="button" className="control-button" onClick={() => setFilter(true)}><Icon name="filter" size={19}/> Filter</button>
      <label className="sort-control"><span>Sort:</span><select aria-label="Sort products" value={params.get("sort") || ""} onChange={event => patchFilters({ sort: event.target.value })}>
        {sorts.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select></label>
      {params.size > 0 && <button type="button" className="text-button" onClick={() => setParams({})}>Clear filters</button>}
    </div>
    {slug === "lamps" && <div className="chips">{tags.map(([id, label]) =>
      <button type="button" className="chip" aria-pressed={params.get("tag") === id} key={id}
        onClick={() => patchFilters({ tag: params.get("tag") === id ? "" : id })}>{label}</button>
    )}</div>}
    {listing.data ? (listing.data.items.length ?
      <div className="product-grid">{listing.data.items.map(product => <ProductCard product={product} key={product.id}/>)}</div> :
      <Empty title="No products match these filters"><button className="text-button" type="button" onClick={() => setParams({})}>Clear filters</button></Empty>
    ) : <LoadState query={listing}/>}
    {filter && <FilterDialog apply={patchFilters} params={params} close={() => setFilter(false)} fixedCategory={slug} collections={collections.data?.items || []}/>}
  </section>;
}

export function Search() {
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
    <h1 className="sr-only">Search products</h1>
    <form role="search" className="search-field" onSubmit={event => { event.preventDefault(); commit(draft.trim()); }}>
      <button type="submit" className="icon-button" aria-label="Search"><Icon name="search"/></button>
      <input ref={input} name="q" aria-label="Search products" placeholder="Search puja essentials" value={draft} maxLength={100} onChange={event => setDraft(event.target.value)}/>
      {draft && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { commit(""); input.current.focus(); }}><Icon name="close"/></button>}
    </form>
    {q && search.data ? <>
      {search.data.suggestions.length > 0 && <ul className="suggestions">{search.data.suggestions.map(term =>
        <li key={term}><button type="button" onClick={() => commit(term)}><Icon name="search" size={18}/> {term}</button></li>
      )}</ul>}
      {search.data.items.length ? <section>
        <div className="section-title"><h2>Products for “{q}”</h2></div>
        <div className="search-results">{search.data.items.map(product => <ProductCard product={product} key={product.id} horizontal/>)}</div>
      </section> : <EmptySearch q={q} commit={commit}/>}
    </> : q ? <LoadState query={search}/> : <EmptySearch commit={commit}/>}
  </section>;
}

function EmptySearch({ q, commit }) {
  return <div className="empty-search">
    <img src={artwork("empty-search")} alt=""/>
    {q && <><h2>No results for “{q}”</h2><p>Try another keyword or browse our categories.</p></>}
    <h3>Try searching for</h3>
    <div className="chips">{examples.map(example => <button type="button" className="chip" key={example} onClick={() => commit(example)}>{example}</button>)}</div>
    <Button to="/categories" icon="grid" className="wide">Browse categories</Button>
  </div>;
}

export function Product() {
  const { slug } = useParams();
  const product = useApi("/products/" + encodeURIComponent(slug));
  return <section className="page product-page">
    {product.data ? <ProductDetail key={slug} product={product.data}/> : <LoadState query={product}/>}
  </section>;
}

function ProductDetail({ product }) {
  const { add, location } = useStore();
  const [variantId, setVariant] = useState(product.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const selected = product.variants.find(variant => variant.id === variantId);
  return <div className="product-detail">
    <div className="detail-photo"><img src={product.image} alt={product.name}/></div>
    <div className="detail-info">
      <div className="detail-heading">
        <div><h1>{product.name}</h1><strong>{money(selected.pricePaise)}</strong></div><Heart product={product}/>
      </div>
      <div className="detail-attributes">
        <label><span><Icon name="box"/> Pack size</span><select value={variantId} onChange={event => { setVariant(event.target.value); setQuantity(1); }}>
          {product.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.packSize}{variant.stock === 0 && " · Sold out"}</option>)}
        </select></label>
        <div><span><Icon name="layers"/> Material</span><span>{product.material}</span></div>
      </div>
      <div className="quantity-row"><span>Quantity</span><Stepper value={quantity} onChange={setQuantity} max={Math.min(10, selected.stock)}/></div>
      <Button className="wide" icon="bag" disabled={!selected.stock} onClick={() => add(product, selected, quantity)}>{selected.stock ? "Add to bag" : "Sold out"}</Button>
      <Link className="inline-delivery" to={"/delivery?next=" + encodeURIComponent("/products/" + product.slug)}><Icon name="truck" size={20}/>{location ? "Delivering to " + location.locality + " · " + location.pin : "Check delivery availability"}</Link>
      {product.description && <p className="product-description">{product.description}</p>}
      {product.bengali && <p className="bengali" lang="bn">{product.bengali}</p>}
    </div>
  </div>;
}

export function Wishlist() {
  const { saved, toggleSaved, add } = useStore();
  const listing = useApi(saved.length ? "/products" : null);
  const products = listing.data?.items.filter(product => saved.includes(product.id)) || [];
  return <section className="page narrow">
    <Title intro={plural(saved.length)}>Saved Items</Title>
    {!saved.length ? <Empty title="Nothing saved yet" to="/shop" action="Shop essentials">Tap the heart on an item to save it here.</Empty> :
      listing.data ? <div className="saved-list">{products.map(product => {
        const variant = product.variants[0];
        return <article className="saved-row" key={product.id}>
          <Link to={"/products/" + product.slug}><img src={product.image} alt={product.name}/></Link>
          <div><h2><Link to={"/products/" + product.slug}>{product.name}</Link></h2>
            {variant.packSize !== "1 pc" && <small>{variant.packSize}</small>}<strong>{money(variant.pricePaise)}</strong>
            <Button secondary icon="bag" disabled={!variant.stock} onClick={() => { if (add(product, variant)) toggleSaved(product.id); }}>{variant.stock ? "Move to bag" : "Sold out"}</Button>
          </div>
          <button type="button" className="icon-button remove-button" aria-label={"Remove " + product.name} onClick={() => toggleSaved(product.id)}><Icon name="close" size={19}/></button>
        </article>;
      })}</div> : <LoadState query={listing}/>}
  </section>;
}

export function Bag() {
  const { updateQuantity, location } = useStore();
  const listing = useBagCatalog();
  const { lines, legacy } = listing;
  const invalid = lines.some(line => !line.variant || line.quantity > line.variant.stock);
  const subtotalPaise = lines.reduce((sum, line) => sum + (line.variant?.pricePaise || 0) * line.quantity, 0);
  const deliveryPaise = subtotalPaise && subtotalPaise < 50000 ? 3000 : 0;
  const estimate = { subtotalPaise, deliveryPaise, totalPaise: subtotalPaise + deliveryPaise };
  return <section className="page">
    <Title intro={plural(lines.reduce((count, line) => count + line.quantity, 0) + (legacy ? 1 : 0))}>Shopping Bag</Title>
    {legacy && <div className="legacy-plan"><Button secondary to={"/packages/" + encodeURIComponent(legacy.id) + "/checkout"}>Check out saved package</Button><button className="text-button" type="button" onClick={() => updateQuantity(legacy.id, 0)}>Remove package</button></div>}
    {!lines.length ? <Empty title={legacy ? "Individual items" : "Your bag is empty"} to="/shop" action="Shop essentials"/> : !listing.data ? <LoadState query={listing}/> :
      <div className="two-column bag-layout">
        <div className="bag-items">{lines.map(({ id, quantity, product, variant }) =>
          <article className="bag-row" key={id}>
            {product ? <Link to={"/products/" + product.slug}><img src={product.image} alt={product.name}/></Link> : <span className="missing-photo"><Icon name="box"/></span>}
            <div><h2>{product ? <Link to={"/products/" + product.slug}>{product.name}</Link> : "Unavailable item"}</h2>
              {variant && <><small>{variant.packSize}</small><strong>{money(variant.pricePaise * quantity)}</strong></>}
              {(!variant || quantity > variant.stock) && <p className="form-error">{variant?.stock ? "Only " + variant.stock + " available." : "This item is unavailable."}</p>}
              {variant && <Stepper label={(product?.name || "Item") + " quantity"} value={quantity} onChange={value => updateQuantity(id, value)} max={Math.min(10, variant.stock)}/>}
            </div>
            <button type="button" className="icon-button remove-button" aria-label={"Remove " + (product?.name || "item")} onClick={() => updateQuantity(id, 0)}><Icon name="close" size={19}/></button>
          </article>
        )}</div>
        <aside className="checkout-summary">
          <Link className="inline-delivery" to="/delivery?next=%2Fbag"><Icon name="truck" size={21}/>{location ? "Deliver to " + location.locality : "Check delivery availability"}</Link>
          <Totals value={estimate}/>
          {invalid ? <Button disabled className="wide" icon="lock">Checkout</Button> : <Button to="/checkout" className="wide" icon="lock">Checkout</Button>}
        </aside>
      </div>}
  </section>;
}

export function Delivery() {
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
      <Title>Delivery not available right now</Title>
      <p role="status">{result.message} Enter another Kolkata PIN to check availability.</p>
      <Button secondary icon="edit" className="wide" onClick={() => edit(false)}>Edit PIN ({pin})</Button>
      <Button icon="pin" className="wide" onClick={() => edit(true)}>Try another address</Button>
    </div> : <>
      <img className="page-art pin-art" src={artwork("pin-hero")} alt=""/>
      <div className="pin-form">
        <Title back={back} intro="Enter your Kolkata PIN to see the delivery timeline for your location.">Check delivery availability</Title>
        <form className="stack" onSubmit={submit}>
          <label>PIN code<input ref={input} autoComplete="postal-code" required value={pin} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} onChange={event => { setPin(event.target.value.replace(/\D/g, "")); setResult(null); }}/></label>
          {result?.eligible && <Notice icon="truck"><strong>Delivery within 24 hours</strong><span role="status">{result.locality}, Kolkata · {pin}</span></Notice>}
          <ErrorMessage error={error}/>
          <Button className="wide" type="submit" disabled={busy}>{busy ? "Checking…" : result?.eligible ? "Confirm location" : "Check PIN"}</Button>
        </form>
      </div>
    </>}
  </section>;
}
