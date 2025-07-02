-- Création de la table des partenaires e-commerce
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    website VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Maroc',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    product_types TEXT[] NOT NULL DEFAULT '{}',
    price_range_min INTEGER NOT NULL DEFAULT 0,
    price_range_max INTEGER NOT NULL DEFAULT 999999,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour la recherche par type de produit
CREATE INDEX IF NOT EXISTS idx_partners_product_types ON partners USING GIN (product_types);

-- Index pour la recherche par localisation
CREATE INDEX IF NOT EXISTS idx_partners_location ON partners (city, country);

-- Index pour la recherche par fourchette de prix
CREATE INDEX IF NOT EXISTS idx_partners_price_range ON partners (price_range_min, price_range_max);

-- Index pour la recherche géographique
CREATE INDEX IF NOT EXISTS idx_partners_coordinates ON partners (latitude, longitude);

-- Déclencheur pour mettre à jour le champ updated_at
CREATE TRIGGER update_partners_modtime
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Insertion de données d'exemple
INSERT INTO partners (name, website, city, country, latitude, longitude, product_types, price_range_min, price_range_max, description) VALUES
('TechStore Paris', 'https://techstore-paris.fr', 'Paris', 'France', 48.8566, 2.3522, ARRAY['électronique', 'informatique', 'smartphones'], 50, 2000, 'Magasin spécialisé en électronique et informatique au cœur de Paris'),
('Mode & Style Lyon', 'https://mode-style-lyon.fr', 'Lyon', 'France', 45.7640, 4.8357, ARRAY['vêtements', 'accessoires', 'chaussures'], 20, 500, 'Boutique de mode tendance à Lyon avec les dernières collections'),
('Électro Marseille', 'https://electro-marseille.fr', 'Marseille', 'France', 43.2965, 5.3698, ARRAY['électroménager', 'électronique'], 100, 1500, 'Spécialiste en électroménager et électronique à Marseille'),
('Sports & Loisirs Toulouse', 'https://sports-toulouse.fr', 'Toulouse', 'France', 43.6047, 1.4442, ARRAY['sport', 'loisirs', 'fitness'], 30, 800, 'Équipements sportifs et de loisirs à Toulouse'),
('Maison & Jardin Nice', 'https://maison-jardin-nice.fr', 'Nice', 'France', 43.7102, 7.2620, ARRAY['maison', 'jardin', 'décoration'], 25, 1000, 'Tout pour la maison et le jardin à Nice'),
('Bijoux & Montres Bordeaux', 'https://bijoux-bordeaux.fr', 'Bordeaux', 'France', 44.8378, -0.5792, ARRAY['bijoux', 'montres', 'accessoires'], 50, 3000, 'Bijouterie fine et montres de luxe à Bordeaux'),
('Auto Parts Lille', 'https://autoparts-lille.fr', 'Lille', 'France', 50.6292, 3.0573, ARRAY['automobile', 'pièces détachées'], 20, 1200, 'Pièces détachées et accessoires automobiles à Lille'),
('Librairie Culturelle Strasbourg', 'https://culture-strasbourg.fr', 'Strasbourg', 'France', 48.5734, 7.7521, ARRAY['livres', 'culture', 'multimédia'], 10, 200, 'Librairie et produits culturels à Strasbourg'),
('Beauty & Cosmetics Nantes', 'https://beauty-nantes.fr', 'Nantes', 'France', 47.2184, -1.5536, ARRAY['cosmétiques', 'beauté', 'parfums'], 15, 300, 'Cosmétiques et produits de beauté à Nantes'),
('Jouets & Enfants Montpellier', 'https://jouets-montpellier.fr', 'Montpellier', 'France', 43.6110, 3.8767, ARRAY['jouets', 'enfants', 'puériculture'], 10, 500, 'Jouets et articles pour enfants à Montpellier');

-- Vérification des données insérées
SELECT COUNT(*) as total_partners FROM partners;