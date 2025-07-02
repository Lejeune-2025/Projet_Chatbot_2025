-- Créer une table simple pour les vérifications de santé
CREATE TABLE IF NOT EXISTS public.health_check (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer une entrée par défaut si la table est vide
INSERT INTO public.health_check (status)
SELECT 'ok'
WHERE NOT EXISTS (SELECT 1 FROM public.health_check);

-- Désactiver la RLS pour cette table
ALTER TABLE public.health_check DISABLE ROW LEVEL SECURITY;

-- Accorder les droits de lecture à tous les utilisateurs
GRANT SELECT ON public.health_check TO anon, authenticated, service_role; 