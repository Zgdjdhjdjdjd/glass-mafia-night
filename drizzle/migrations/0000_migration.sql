CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  name text NOT NULL,
  role text,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.game_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  started boolean NOT NULL DEFAULT false
);
INSERT INTO public.game_state (id, started) VALUES (1, false);
GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.game_state TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;