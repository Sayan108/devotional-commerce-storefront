import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "@fontsource/noto-serif-bengali/bengali-400.css";
import "@fontsource/noto-serif-bengali/bengali-700.css";
import { LanguageProvider } from "./shared/i18n";
import { StoreProvider } from "./shared/store";
import { App } from "./app/App";
import { Capacitor } from "@capacitor/core";
import "./app/styles.css";

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => console.error("Service worker registration failed", error));
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><LanguageProvider><BrowserRouter><StoreProvider><App/></StoreProvider></BrowserRouter></LanguageProvider></React.StrictMode>
);
