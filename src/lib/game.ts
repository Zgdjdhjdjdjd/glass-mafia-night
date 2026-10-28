// Runs in the browser and calls the database functions directly with the public key,
// so the game works on any static or serverless host (Vercel, Netlify, ...) with no setup.
// All game rules and privacy checks live in the database functions.
const URL =
  import.meta.env['VITE_SUPABASE_URL'] || "https://c--15f635b6-4e50-4f82-ab7b-872d67354ba4-prod.lovable.cloud";
const KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || "sb_publishable_YMaDIFhzaVkCcyx4qo8AIA_abJI9xGB";

export const MAX_PLAYERS = 23;

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
    return (text ? JSON.parse(text) : null) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function adminHash(code: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mafia-admin-v1:" + code));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function assignRoles(count: number): string[] {
  const roles = ["Mafia", "Mafia", "Mafia", "Joker", "Detective", "Doctor"];
  while (roles.length < count) roles.push("Civilian");
  for (let i = roles.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0]! % (i + 1);
    [roles[i], roles[j]] = [roles[j]!, roles[i]!];
  }
  return roles;
}

export async function getState(token: string) {
  const s = await rpc<{ names: string[] | null; started: boolean; myName: string | null }>("mafia_state", {
    p_token: token,
  });
  const names = s.names ?? [];
  return { names, count: names.length, max: MAX_PLAYERS, started: !!s.started, joined: !!s.myName, myName: s.myName ?? null };
}

export async function joinGame(token: string, name: string) {
  const n = name.trim().slice(0, 24);
  if (!n) return { ok: false as const, error: "Enter a name." };
  const r = await rpc<string>("mafia_join", { p_token: token, p_name: n });
  return r === "ok" ? { ok: true as const } : { ok: false as const, error: r };
}

export async function getMyCard(token: string) {
  return (await rpc<string | null>("mafia_my_card", { p_token: token })) ?? null;
}

export async function unlockAdmin(code: string) {
  const token = await adminHash(code);
  const ok = (await rpc<unknown>("mafia_admin_view", { p_admin: token })) !== null;
  return ok ? token : null;
}

export async function adminView(adminToken: string) {
  return rpc<{ name: string; role: string | null }[] | null>("mafia_admin_view", { p_admin: adminToken });
}

export async function startGame(adminToken: string) {
  const r = await rpc<string>("mafia_start", { p_admin: adminToken });
  return r === "ok" ? { ok: true as const } : { ok: false as const, error: r };
}

export async function resetGame(adminToken: string) {
  return rpc<boolean>("mafia_reset", { p_admin: adminToken });
}
