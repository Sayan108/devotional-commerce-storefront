import { useEffect, useRef, useState } from "react";

export async function request(path, { method = "GET", body, headers, signal } = {}) {
  const result = await fetch("/v1" + path, {
    method, signal, credentials: "same-origin",
    headers: { ...(body && { "Content-Type": "application/json" }), ...headers },
    ...(body && { body: JSON.stringify(body) })
  });
  if (result.status === 204) return null;
  let data;
  try { data = await result.json(); }
  catch { throw new Error("The store is temporarily unavailable. Please try again."); }
  if (!result.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    Object.assign(error, data, { status: result.status });
    throw error;
  }
  return data;
}

export function useApi(path) {
  const [state, setState] = useState({ path: null });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    request(path, { signal: controller.signal })
      .then(data => setState({ path, data }))
      .catch(error => { if (error.name !== "AbortError") setState({ path, error }); });
    return () => controller.abort();
  }, [path, revision]);
  const current = state.path === path ? state : {};
  return { ...current, loading: Boolean(path && !current.data && !current.error), reload: () => setRevision(value => value + 1) };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const active = useRef(false);
  const run = async action => {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); active.current = false; }
  };
  return { busy, error, run, setError };
}
