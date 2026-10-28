import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MAX_PLAYERS = 23;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function adminToken(code: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("mafia-admin-v1:" + code),
  );
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function isAdmin(token: string | undefined) {
  const code = process.env["ADMIN_CODE"];
  if (!code || !token) return false;
  return token === (await adminToken(code));
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

// Public state: names + count + started. Never includes roles.
export const getState = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const [{ data: players }, { data: state }] = await Promise.all([
      sb.from("players").select("name, token").order("joined_at"),
      sb.from("game_state").select("started").eq("id", 1).single(),
    ]);
    const list = players ?? [];
    return {
      names: list.map((p) => p.name),
      count: list.length,
      max: MAX_PLAYERS,
      started: state?.started ?? false,
      joined: !!data.token && list.some((p) => p.token === data.token),
      myName: list.find((p) => p.token === data.token)?.name ?? null,
    };
  });

export const joinGame = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(10).max(100), name: z.string().trim().min(1).max(24) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: existing } = await sb.from("players").select("id").eq("token", data.token).maybeSingle();
    if (existing) return { ok: true as const };
    const { data: state } = await sb.from("game_state").select("started").eq("id", 1).single();
    if (state?.started) return { ok: false as const, error: "The game has already started." };
    const { count } = await sb.from("players").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_PLAYERS) return { ok: false as const, error: "The room is full." };
    const { data: dup } = await sb.from("players").select("id").ilike("name", data.name).maybeSingle();
    if (dup) return { ok: false as const, error: "That name is taken." };
    const { error } = await sb.from("players").insert({ token: data.token, name: data.name });
    if (error) return { ok: false as const, error: "Could not join. Try again." };
    return { ok: true as const };
  });

export const getMyCard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: p } = await sb.from("players").select("role").eq("token", data.token).maybeSingle();
    return { role: p?.role ?? null };
  });

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const code = process.env["ADMIN_CODE"];
    if (!code || data.code !== code) return { ok: false as const };
    return { ok: true as const, adminToken: await adminToken(code) };
  });

export const adminView = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isAdmin(data.adminToken))) return { ok: false as const, players: [] };
    const sb = await db();
    const { data: players } = await sb.from("players").select("name, role").order("joined_at");
    return { ok: true as const, players: players ?? [] };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isAdmin(data.adminToken))) return { ok: false as const, error: "Not authorized." };
    const sb = await db();
    const { data: state } = await sb.from("game_state").select("started").eq("id", 1).single();
    if (state?.started) return { ok: false as const, error: "Game already started." };
    const { data: players } = await sb.from("players").select("id");
    const list = players ?? [];
    if (list.length < 6) return { ok: false as const, error: "At least 6 players are needed." };
    const roles = assignRoles(list.length);
    for (let i = 0; i < list.length; i++) {
      await sb.from("players").update({ role: roles[i]! }).eq("id", list[i]!.id);
    }
    await sb.from("game_state").update({ started: true }).eq("id", 1);
    return { ok: true as const };
  });

export const resetGame = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isAdmin(data.adminToken))) return { ok: false as const };
    const sb = await db();
    await sb.from("players").update({ role: null }).not("id", "is", null);
    await sb.from("game_state").update({ started: false }).eq("id", 1);
    return { ok: true as const };
  });
