-- Fonction pour créer une session (bypass RLS)
CREATE OR REPLACE FUNCTION public.create_session(
  session_id UUID,
  user_id TEXT,
  expires_at TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les privilèges du créateur de la fonction
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sessions (id, user_id, expires_at)
  VALUES (session_id, user_id, expires_at);
  
  RETURN session_id;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Erreur lors de la création de la session: %', SQLERRM;
END;
$$;

-- Fonction pour valider une session (bypass RLS)
CREATE OR REPLACE FUNCTION public.validate_session(
  session_id UUID
) RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record public.sessions;
BEGIN
  SELECT *
  INTO session_record
  FROM public.sessions
  WHERE id = session_id
  AND expires_at > NOW();
  
  RETURN session_record;
END;
$$;

-- Fonction pour supprimer une session (bypass RLS)
CREATE OR REPLACE FUNCTION public.delete_session(
  session_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sessions
  WHERE id = session_id;
END;
$$;

-- Créer la table sessions si elle n'existe pas
CREATE OR REPLACE FUNCTION public.create_sessions_table()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB
  );
  
  -- Ajouter une politique RLS pour restreindre l'accès
  ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
  
  -- Politique pour permettre à un utilisateur de voir ses propres sessions
  CREATE POLICY sessions_user_read ON public.sessions
    FOR SELECT
    USING (auth.uid()::text = user_id);
    
  -- Politique pour permettre à un utilisateur de supprimer ses propres sessions
  CREATE POLICY sessions_user_delete ON public.sessions
    FOR DELETE
    USING (auth.uid()::text = user_id);
    
  EXCEPTION
    WHEN duplicate_table THEN
      NULL;
END;
$$; 