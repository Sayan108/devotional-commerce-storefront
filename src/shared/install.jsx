import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useI18n } from "./i18n";

let deferredPrompt = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());

window.addEventListener("beforeinstallprompt", event => {
  if (Capacitor.isNativePlatform()) return;
  event.preventDefault();
  deferredPrompt = event;
  notify();
});
window.addEventListener("appinstalled", () => {
  installed = true;
  deferredPrompt = null;
  notify();
});

const standalone = () => installed || Capacitor.isNativePlatform() || window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: minimal-ui)").matches ||
  window.navigator.standalone === true;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function InstallApp({ className = "" }) {
  const { t } = useI18n();
  const [, refresh] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => refresh(value => value + 1);
    const modes = ["standalone", "fullscreen", "minimal-ui"].map(mode => window.matchMedia(`(display-mode: ${mode})`));
    listeners.add(update);
    modes.forEach(mode => mode.addEventListener("change", update));
    return () => {
      listeners.delete(update);
      modes.forEach(mode => mode.removeEventListener("change", update));
    };
  }, []);

  if (standalone() || (!deferredPrompt && !ios() && !message)) return null;
  async function install() {
    setMessage("");
    if (!deferredPrompt) {
      setMessage(t("installIos"));
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      notify();
    } catch (error) {
      console.error("PWA install prompt failed", error);
      setMessage(t("installError"));
    }
  }
  return <div className={"install-app " + className}>
    {(deferredPrompt || ios()) && <button type="button" className="button install-button" onClick={install}>{t("installApp")}</button>}
    {message && <p role="status">{message}</p>}
  </div>;
}
