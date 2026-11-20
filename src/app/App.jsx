import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Bag, Categories, Delivery, Home, Product, Search, Shop, Wishlist } from "../features/catalog";
import { CheckoutAddress, CheckoutReview, Login, Verify } from "../features/checkout";
import { Confirmation, OrderDetail, Orders, Payment, PaymentPending, Tracking } from "../features/orders";
import { ManagePackage, MyPackages, PackageDetail, Packages } from "../features/packages";
import { Account, Addresses, Refund, Returns } from "../features/customer";
import { BuyerGate, Button, Empty, Icon, Title } from "../shared/ui";
import { useStore } from "../shared/store";
import { useI18n } from "../shared/i18n";
import { numeral } from "../shared/format";

const mainLinks = [["/shop", "shop"], ["/categories", "categories"], ["/packages", "packages"], ["/orders", "trackOrder"]];
const mobileLinks = [["/", "home", "home"], ["/categories", "categories", "grid"], ["/search", "search", "search"], ["/orders", "orders", "box"], ["/account", "account", "user"]];

function Wordmark() {
  const { lang, t } = useI18n();
  const bengali = lang === "bn";
  return <Link className={"wordmark" + (bengali ? " bn" : "")} to="/" lang={lang} aria-label={t("homeAria")}>{bengali ? "নৈবেদ্য" : "Naivedya"}</Link>;
}

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return <div className="lang-toggle" role="group" aria-label={t("language")}>
    <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
    <button type="button" aria-pressed={lang === "bn"} onClick={() => setLang("bn")}>বাং</button>
  </div>;
}

function Header() {
  const { bag } = useStore();
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const route = useLocation();
  const menuButton = useRef(null);
  const header = useRef(null);
  const items = bag.reduce((count, line) => count + line.quantity, 0);
  useEffect(() => { setMenu(false); }, [route.pathname]);
  useEffect(() => {
    if (!menu) return;
    const closeOutside = event => { if (!header.current?.contains(event.target)) setMenu(false); };
    const closeOnEscape = event => { if (event.key === "Escape") { setMenu(false); menuButton.current?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);
  return <header className="site-header" ref={header}>
    <div className="header-inner">
      <button type="button" className="icon-button menu-toggle" aria-label={menu ? t("closeMenu") : t("openMenu")} aria-expanded={menu} aria-controls="store-menu"
        ref={menuButton} onClick={() => setMenu(!menu)}><Icon name={menu ? "close" : "menu"} size={25}/></button>
      <Wordmark/>
      <nav className="desktop-nav" aria-label={t("mainNav")}>{mainLinks.map(([to, label]) => <NavLink key={to} to={to}>{t(label)}</NavLink>)}</nav>
      <div className="header-actions">
        <LanguageSwitch/>
        <Link className="icon-button" to="/search" aria-label={t("search")}><Icon name="search" size={24}/></Link>
        <Link className="icon-button" to="/wishlist" aria-label={t("savedItems")}><Icon name="heart" size={24}/></Link>
        <Link className="icon-button header-account" to="/account" aria-label={t("account")}><Icon name="user" size={23}/></Link>
        <Link className="icon-button bag-link" to="/bag" aria-label={t("bagCount", { count: numeral(items) })}><Icon name="cart" size={24}/>{items > 0 && <span>{items > 99 ? "99+" : numeral(items)}</span>}</Link>
      </div>
    </div>
    {menu && <nav className="menu-panel" id="store-menu" aria-label={t("shopMenu")}>
      {[...mainLinks, ["/wishlist", "savedItems"], ["/account", "myAccount"], ["/delivery", "checkDelivery"]].map(([to, label]) => <NavLink key={to} to={to} onClick={() => setMenu(false)}>{t(label)}<Icon name="chevron" size={17}/></NavLink>)}
    </nav>}
  </header>;
}

function MobileNav() {
  const { t } = useI18n();
  return <footer className="mobile-footer">
    <nav className="mobile-nav" aria-label={t("quickNav")}>{mobileLinks.map(([to, label, icon]) =>
      <NavLink key={to} to={to} end={to === "/"}><Icon name={icon} size={21}/><span>{t(label)}</span></NavLink>
    )}</nav>
  </footer>;
}

function Footer() {
  const { t } = useI18n();
  return <footer className="footer"><Wordmark/>
    <nav aria-label={t("storeInfo")}>
      <Link to="/delivery">{t("checkDelivery")}</Link><Link to="/help/shipping">{t("shipping")}</Link>
      <Link to="/help/cancellation">{t("cancellation")}</Link><Link to="/help/tracking">{t("orderSupport")}</Link>
    </nav>
  </footer>;
}

function Help() {
  const { slug } = useParams();
  const { t } = useI18n();
  const pages = {
    shipping: ["shipping", "shippingCopy", "/delivery", "checkDeliveryAction"],
    cancellation: ["cancellation", "cancellationCopy", "/returns", "helpReturns"],
    tracking: ["trackOrder", "trackingCopy", "/orders", "myOrders"]
  };
  const page = pages[slug];
  if (!page) return <NotFound/>;
  const [title, copy, to, label] = page;
  return <section className="page narrow help-page"><Title>{t(title)}</Title><p>{t(copy)}</p><Button to={to}>{t(label)}</Button></section>;
}

function NotFound() {
  const { t } = useI18n();
  return <section className="page narrow"><Empty title={t("pageNotFound")} to="/" action={t("backHome")}/></section>;
}

export function App() {
  const location = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    window.scrollTo(0, 0);
    const privatePage = /^\/(?:login|verify|bag|checkout|orders|account|returns|refunds|search|wishlist)(?:\/|$)|\/checkout(?:\/|$)/.test(location.pathname);
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = privatePage ? "noindex,nofollow" : "index,follow";
  }, [location.pathname]);
  return <>
    <a className="skip-link" href="#content">{t("skip")}</a>
    <Header/>
    <main id="content" className="page-enter" key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/shop" element={<Shop/>}/>
        <Route path="/categories" element={<Categories/>}/>
        <Route path="/collections/packages" element={<Navigate to="/packages" replace/>}/>
        <Route path="/collections/:slug" element={<Shop/>}/>
        <Route path="/search" element={<Search/>}/>
        <Route path="/products/:slug" element={<Product/>}/>
        <Route path="/wishlist" element={<Wishlist/>}/>
        <Route path="/bag" element={<Bag/>}/>
        <Route path="/delivery" element={<Delivery/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/verify" element={<Verify/>}/>
        <Route path="/checkout" element={<BuyerGate><CheckoutAddress/></BuyerGate>}/>
        <Route path="/checkout/review" element={<BuyerGate><CheckoutReview/></BuyerGate>}/>
        <Route path="/packages" element={<Packages/>}/>
        <Route path="/packages/:slug" element={<PackageDetail/>}/>
        <Route path="/packages/:slug/checkout" element={<BuyerGate><CheckoutAddress packageMode/></BuyerGate>}/>
        <Route path="/packages/:slug/checkout/review" element={<BuyerGate><CheckoutReview packageMode/></BuyerGate>}/>
        <Route path="/orders" element={<BuyerGate><Orders/></BuyerGate>}/>
        <Route path="/orders/:ref" element={<BuyerGate><OrderDetail/></BuyerGate>}/>
        <Route path="/orders/:ref/payment" element={<BuyerGate><Payment/></BuyerGate>}/>
        <Route path="/orders/:ref/payment-pending" element={<BuyerGate><PaymentPending/></BuyerGate>}/>
        <Route path="/orders/:ref/confirmation" element={<BuyerGate><Confirmation/></BuyerGate>}/>
        <Route path="/orders/:ref/tracking" element={<BuyerGate><Tracking/></BuyerGate>}/>
        <Route path="/orders/:ref/package" element={<BuyerGate><ManagePackage/></BuyerGate>}/>
        <Route path="/account" element={<Account/>}/>
        <Route path="/account/addresses" element={<BuyerGate account><Addresses/></BuyerGate>}/>
        <Route path="/account/packages" element={<BuyerGate><MyPackages/></BuyerGate>}/>
        <Route path="/returns" element={<BuyerGate><Returns/></BuyerGate>}/>
        <Route path="/refunds/:ref" element={<BuyerGate><Refund/></BuyerGate>}/>
        <Route path="/help/:slug" element={<Help/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </main>
    <Footer/>
    <MobileNav/>
  </>;
}
