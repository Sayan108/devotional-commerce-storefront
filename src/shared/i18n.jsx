import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { brand, catalog, messages, ui } from "./copy";
import { setLocale } from "./format";

const Language = createContext(null);
const storageKey = "naivedya-lang";

const englishUi = new Map(Object.entries(ui).map(([key, [english]]) => [english, key]));
const catalogFold = new Map(Object.entries(catalog).map(([english, bengali]) => [english.toLowerCase(), bengali]));

export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export function translate(lang, key, vars) {
  const pair = ui[key];
  if (!pair) return key;
  return fill(lang === "bn" ? pair[1] : pair[0], vars);
}

export function phrase(lang, text) {
  if (lang !== "bn" || typeof text !== "string" || !text) return text ?? "";
  if (catalog[text]) return catalog[text];
  if (catalogFold.get(text.toLowerCase())) return catalogFold.get(text.toLowerCase());
  if (messages[text]) return messages[text];
  const key = englishUi.get(text);
  return key ? ui[key][1] : text;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(storageKey) === "bn" ? "bn" : "en"; }
    catch { return "en"; }
  });
  const setLang = value => {
    setLangState(value);
    try { localStorage.setItem(storageKey, value); } catch { /* private browsing */ }
  };
  setLocale(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = brand[lang];
  }, [lang]);
  const value = useMemo(() => ({
    lang, setLang,
    t: (key, vars) => translate(lang, key, vars),
    tx: text => phrase(lang, text)
  }), [lang]);
  return <Language.Provider value={value}>{children}</Language.Provider>;
}

export function useI18n() {
  const value = useContext(Language);
  if (!value) throw new Error("useI18n must be used within LanguageProvider");
  return value;
}
