import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Bag, Categories, Delivery, Home, Product, Search, Shop, Wishlist } from "../features/catalog";
import { CheckoutAddress, CheckoutReview, Login, Verify } from "../features/checkout";
import { Confirmation, OrderDetail, Orders, Payment, PaymentPending, Tracking } from "../features/orders";
import { ManagePackage, MyPackages, PackageDetail, Packages } from "../features/packages";
import { Account, Addresses, Refund, Returns } from "../features/customer";
import { BuyerGate, Button, Empty, Icon, Title } from "../shared/ui";
import { useStore } from "../shared/store";

const mainLinks = [["/shop", "Shop"], ["/categories", "Categories"], ["/packages", "Packages"], ["/orders", "Track order"]];
const mobileLinks = [["/", "Home", "home"], ["/categories", "Categories", "grid"], ["/search", "Search", "search"], ["/orders", "Orders", "box"], ["/account", "Account", "user"]];

function Header() {
  const { bag } = useStore();
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
      <button type="button" className="icon-button menu-toggle" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} aria-controls="store-menu"
        ref={menuButton} onClick={() => setMenu(!menu)}><Icon name={menu ? "close" : "menu"} size={25}/></button>
      <Link className="wordmark" to="/" aria-label="Arghya home">Arghya <i>/</i> <span lang="bn">অর্ঘ্য</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{mainLinks.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
      <div className="header-actions">
        <Link className="icon-button" to="/search" aria-label="Search"><Icon name="search" size={24}/></Link>
        <Link className="icon-button" to="/wishlist" aria-label="Saved items"><Icon name="heart" size={24}/></Link>
        <Link className="icon-button header-account" to="/account" aria-label="Account"><Icon name="user" size={23}/></Link>
        <Link className="icon-button bag-link" to="/bag" aria-label={"Shopping bag, " + items + " items"}><Icon name="cart" size={24}/>{items > 0 && <span>{items > 99 ? "99+" : items}</span>}</Link>
      </div>
    </div>
    {menu && <nav className="menu-panel" id="store-menu" aria-label="Shop menu">
      {[...mainLinks, ["/wishlist", "Saved items"], ["/account", "My account"], ["/delivery", "Check delivery"]].map(([to, label]) => <NavLink key={to} to={to} onClick={() => setMenu(false)}>{label}<Icon name="chevron" size={17}/></NavLink>)}
    </nav>}
  </header>;
}

function MobileNav() {
  return <footer className="mobile-footer">
    <nav className="mobile-nav" aria-label="Quick navigation">{mobileLinks.map(([to, label, icon]) =>
      <NavLink key={to} to={to} end={to === "/"}><Icon name={icon} size={21}/><span>{label}</span></NavLink>
    )}</nav>
  </footer>;
}

function Footer() {
  return <footer className="footer"><Link className="wordmark" to="/">Arghya <i>/</i> <span lang="bn">অর্ঘ্য</span></Link>
    <nav aria-label="Store information">
      <Link to="/delivery">Check delivery</Link><Link to="/help/shipping">Shipping</Link>
      <Link to="/help/cancellation">Cancellation &amp; refunds</Link><Link to="/help/tracking">Order support</Link>
    </nav>
  </footer>;
}

function Help() {
  const { slug } = useParams();
  const pages = {
    shipping: ["Shipping", "Delivery is available for eligible Kolkata PIN codes. Check your PIN before shopping and confirm the full address at checkout. Your order receipt shows the estimated delivery deadline.", "/delivery", "Check delivery"],
    cancellation: ["Cancellation & refunds", "Open your paid order to request help with damaged, wrong or missing items. Refund requests are reviewed individually and refunded to the original payment method when approved.", "/returns", "Help & returns"],
    tracking: ["Track an order", "Verify the same mobile number you used at checkout to open your private order history, view tracking, or continue a pending payment.", "/orders", "My orders"]
  };
  const page = pages[slug];
  if (!page) return <NotFound/>;
  const [title, copy, to, label] = page;
  return <section className="page narrow help-page"><Title>{title}</Title><p>{copy}</p><Button to={to}>{label}</Button></section>;
}

function NotFound() {
  return <section className="page narrow"><Empty title="Page not found" to="/" action="Back to home"/></section>;
}

export function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const privatePage = /^\/(?:login|verify|bag|checkout|orders|account|returns|refunds|search|wishlist)(?:\/|$)|\/checkout(?:\/|$)/.test(location.pathname);
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = privatePage ? "noindex,nofollow" : "index,follow";
  }, [location.pathname]);
  return <>
    <a className="skip-link" href="#content">Skip to content</a>
    <Header/>
    <main id="content">
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
