import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getState, joinGame, getMyCard, unlockAdmin, adminView, startGame, resetGame,
} from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mafia — Join the Game" },
      { name: "description", content: "Join the room, wait in the lobby, and reveal your secret Mafia card." },
      { property: "og:title", content: "Mafia — Join the Game" },
      { property: "og:description", content: "Join the room and reveal your secret Mafia card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Game,
});

const EMOJI: Record<string, string> = {
  Mafia: "🔪", Joker: "🃏", Detective: "🕵️", Doctor: "🩺", Civilian: "👤",
};

type State = Awaited<ReturnType<typeof getState>>;

function getToken() {
  let t = localStorage.getItem("mafia_token");
  if (!t) { t = crypto.randomUUID(); localStorage.setItem("mafia_token", t); }
  return t;
}

function Game() {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [chart, setChart] = useState<{ name: string; role: string | null }[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setToken(getToken());
    setAdmin(localStorage.getItem("mafia_admin"));
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const tick = async () => {
      try {
        const s = await getState(token);
        if (!alive) return;
        setState(s); setLoadError("");
        if (!s.started) setRole(null);
        if (admin) {
          const a = await adminView(admin);
          if (a === null) { localStorage.removeItem("mafia_admin"); setAdmin(null); }
          else if (alive) setChart(a);
        }
      } catch (e) { if (alive) setLoadError(e instanceof Error ? e.message : "unknown error"); }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [token, admin]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch { setError("Something went wrong. Try again."); }
    setBusy(false);
  };

  const onJoin = () => run(async () => {
    const r = await joinGame(token!, name);
    if (!r.ok) setError(r.error);
    else setState(await getState(token!));
  });

  const onUnlock = () => run(async () => {
    const t = await unlockAdmin(code);
    if (!t) { setError("Wrong code."); return; }
    localStorage.setItem("mafia_admin", t);
    setAdmin(t); setCode(""); setShowUnlock(false);
  });

  const onStart = () => run(async () => {
    const r = await startGame(admin!);
    if (!r.ok) setError(r.error);
  });

  const onReset = () => {
    if (!confirm("Reset the game? All cards will be cleared and everyone returns to the lobby.")) return;
    run(async () => { await resetGame(admin!); setRole(null); });
  };

  const onReveal = () => run(async () => {
    setRole(await getMyCard(token!));
  });

  if (!state) {
    return (
      <Shell>
        <p className="text-center text-muted-foreground">
          {loadError ? `Can't reach the game server: ${loadError}` : "Loading…"}
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Mafia</h1>
        <p className="mt-2 text-sm font-semibold tracking-[0.2em] text-muted-foreground">
          {state.count}/{state.max} PLAYERS
        </p>
      </header>

      {/* Screen 1: Join */}
      {!state.joined && (
        <section className="glass animate-rise p-6 space-y-4">
          {state.started ? (
            <p className="text-center text-muted-foreground">The game has already started.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Enter your name</h2>
              <input className="field" value={name} maxLength={24} placeholder="Your name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin()} />
              <button className="btn btn-primary w-full" disabled={busy || !name.trim() || state.count >= state.max}
                onClick={onJoin}>
                {state.count >= state.max ? "Room full" : "Join game"}
              </button>
            </>
          )}
        </section>
      )}

      {/* Screen 3: Game — reveal card */}
      {state.joined && state.started && (
        <section className="glass animate-rise p-6 text-center space-y-4">
          <p className="text-muted-foreground">Playing as <span className="text-foreground font-semibold">{state.myName}</span></p>
          {role ? (
            <div className="animate-rise py-6">
              <div className="text-7xl">{EMOJI[role]}</div>
              <div className="mt-4 text-3xl font-bold">{role}</div>
              <p className="mt-2 text-xs text-muted-foreground">Keep this secret.</p>
              <button className="btn btn-glass mt-6" onClick={() => setRole(null)}>Hide card</button>
            </div>
          ) : (
            <button className="btn btn-primary w-full" disabled={busy} onClick={onReveal}>Reveal my card</button>
          )}
        </section>
      )}

      {/* Screen 2: Lobby */}
      {(state.joined && !state.started) || (!state.joined && !admin) ? (
        <section className="glass animate-rise p-6">
          {state.joined && !state.started && (
            <p className="mb-4 text-center text-muted-foreground">
              Hi <span className="text-foreground font-semibold">{state.myName}</span> — waiting for the admin to start…
            </p>
          )}
          <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground">IN THE ROOM</h2>
          {state.names.length === 0 ? (
            <p className="text-muted-foreground text-sm">No one has joined yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {state.names.map((n) => (
                <li key={n} className="btn-glass rounded-full px-3 py-1.5 text-sm">{n}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Admin */}
      {admin ? (
        <section className="glass animate-rise p-6 space-y-4">
          <h2 className="text-lg font-semibold">Admin</h2>
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" disabled={busy || state.started || state.count < 6} onClick={onStart}>
              Start game
            </button>
            <button className="btn btn-danger flex-1" disabled={busy} onClick={onReset}>Reset game</button>
          </div>
          {!state.started && state.count < 6 && (
            <p className="text-xs text-muted-foreground">At least 6 players are needed to start.</p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 font-medium">Player name</th>
                <th className="py-2 font-medium">Assigned character</th>
              </tr>
            </thead>
            <tbody>
              {chart.map((p) => (
                <tr key={p.name} className="border-t">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.role ? `${EMOJI[p.role]} ${p.role}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="text-center">
          {showUnlock ? (
            <div className="glass animate-rise p-4 flex gap-2">
              <input className="field" type="password" placeholder="Admin code" value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && code && onUnlock()} />
              <button className="btn btn-primary" disabled={busy || !code} onClick={onUnlock}>Unlock</button>
            </div>
          ) : (
            <button className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setShowUnlock(true)}>
              Admin
            </button>
          )}
        </div>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-10">{children}</main>;
}
