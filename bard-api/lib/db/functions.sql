-- Fonction pour exécuter du SQL dynamique
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $BODY$
BEGIN
    EXECUTE sql;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les colonnes d'une table
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable boolean
) AS $BODY$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        (c.is_nullable = 'YES')::boolean
    FROM information_schema.columns c
    WHERE c.table_name = p_table_name
    AND c.table_schema = 'public';
END;
$BODY$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour la table users
CREATE OR REPLACE FUNCTION alter_users_table(
    add_device_info boolean DEFAULT false,
    add_password_hash boolean DEFAULT false
) RETURNS void AS $BODY$
BEGIN
    IF add_device_info THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF add_password_hash THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    END IF;
END;
$BODY$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour la table sessions
CREATE OR REPLACE FUNCTION alter_sessions_table(
    add_device_info boolean DEFAULT false
) RETURNS void AS $BODY$
BEGIN
    IF add_device_info THEN
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;
    END IF;
END;
$BODY$ LANGUAGE plpgsql; 