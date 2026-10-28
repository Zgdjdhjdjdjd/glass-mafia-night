CREATE TABLE IF NOT EXISTS public.admin_config (id int PRIMARY KEY DEFAULT 1, token_hash text NOT NULL);
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_config FROM anon, authenticated;
INSERT INTO public.admin_config (id, token_hash) VALUES (1, '17cd4339f95b5bb668ba4d7603c0a17e366aa335f7145e29c032df9884470f77') ON CONFLICT (id) DO UPDATE SET token_hash = EXCLUDED.token_hash;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_is_admin(p_token text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_config WHERE id = 1 AND token_hash = p_token);
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_state(p_token text) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'names', COALESCE((SELECT json_agg(name ORDER BY joined_at) FROM public.players), '[]'::json),
    'started', COALESCE((SELECT started FROM public.game_state WHERE id = 1), false),
    'myName', (SELECT name FROM public.players WHERE token = p_token));
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_join(p_token text, p_name text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.players WHERE token = p_token) THEN RETURN 'ok'; END IF;
  IF (SELECT started FROM public.game_state WHERE id = 1) THEN RETURN 'The game has already started.'; END IF;
  IF (SELECT count(*) FROM public.players) >= 23 THEN RETURN 'The room is full.'; END IF;
  IF EXISTS (SELECT 1 FROM public.players WHERE lower(name) = lower(p_name)) THEN RETURN 'That name is taken.'; END IF;
  INSERT INTO public.players (token, name) VALUES (p_token, p_name);
  RETURN 'ok';
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_my_card(p_token text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.players WHERE token = p_token;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_admin_view(p_admin text) RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.mafia_is_admin(p_admin) THEN RETURN NULL; END IF;
  RETURN COALESCE((SELECT json_agg(json_build_object('name', name, 'role', role) ORDER BY joined_at) FROM public.players), '[]'::json);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_start(p_admin text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.mafia_is_admin(p_admin) THEN RETURN 'Not authorized.'; END IF;
  IF (SELECT started FROM public.game_state WHERE id = 1) THEN RETURN 'Game already started.'; END IF;
  IF (SELECT count(*) FROM public.players) < 6 THEN RETURN 'At least 6 players are needed.'; END IF;
  UPDATE public.players p SET role = CASE WHEN r.n <= 3 THEN 'Mafia' WHEN r.n = 4 THEN 'Joker' WHEN r.n = 5 THEN 'Detective' WHEN r.n = 6 THEN 'Doctor' ELSE 'Civilian' END
  FROM (SELECT id, row_number() OVER (ORDER BY gen_random_uuid()) AS n FROM public.players) r WHERE p.id = r.id;
  UPDATE public.game_state SET started = true WHERE id = 1;
  RETURN 'ok';
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.mafia_reset(p_admin text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.mafia_is_admin(p_admin) THEN RETURN false; END IF;
  UPDATE public.players SET role = NULL WHERE true;
  UPDATE public.game_state SET started = false WHERE id = 1;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.mafia_is_admin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mafia_state(text), public.mafia_join(text, text), public.mafia_my_card(text), public.mafia_admin_view(text), public.mafia_start(text), public.mafia_reset(text) TO anon, authenticated;
