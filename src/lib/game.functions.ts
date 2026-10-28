import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const MAX_PLAYERS = 23;

// Uses only the public URL + publishable key so it works on any host (e.g. Vercel).
// All game rules and privacy checks live in database functions.
function db() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY environment variables.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db() as any).rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

async function adminToken(code: string) {
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

export const getState = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data }) => {
    const s = await rpc<{ names: string[]; started: boolean; myName: string | null }>("mafia_state", {
      p_token: data.token ?? "",
    });
    return {
      names: s.names ?? [],
      count: (s.names ?? []).length,
      max: MAX_PLAYERS,
      started: !!s.started,
      joined: !!s.myName,
      myName: s.myName ?? null,
    };
  });

export const joinGame = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(10).max(100), name: z.string().trim().min(1).max(24) }).parse(d),
  )
  .handler(async ({ data }) => {
    const r = await rpc<string>("mafia_join", { p_token: data.token, p_name: data.name });
    return r === "ok" ? { ok: true as const } : { ok: false as const, error: r };
  });

export const getMyCard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const role = await rpc<string | null>("mafia_my_card", { p_token: data.token });
    return { role: role ?? null };
  });

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const token = await adminToken(data.code);
    const ok = (await rpc<unknown>("mafia_admin_view", { p_admin: token })) !== null;
    return ok ? { ok: true as const, adminToken: token } : { ok: false as const };
  });

export const adminView = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const players = await rpc<{ name: string; role: string | null }[] | null>("mafia_admin_view", {
      p_admin: data.adminToken,
    });
    return players === null ? { ok: false as const, players: [] } : { ok: true as const, players };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const r = await rpc<string>("mafia_start", { p_admin: data.adminToken });
    return r === "ok" ? { ok: true as const } : { ok: false as const, error: r };
  });

export const resetGame = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    return { ok: await rpc<boolean>("mafia_reset", { p_admin: data.adminToken }) };
  });
