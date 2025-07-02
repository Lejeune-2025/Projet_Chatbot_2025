-- Script pour initialiser la base de connaissances Yonetwork

-- Création des catégories
INSERT INTO knowledge_categories (name, description) VALUES
('Présentation', 'Informations générales sur Yonetwork'),
('Services', 'Services proposés par Yonetwork'),
('Contact', 'Informations de contact et localisation'),
('Horaires', 'Horaires d''ouverture et de disponibilité'),
('Équipe', 'Informations sur l''équipe Yonetwork'),
('FAQ', 'Questions fréquemment posées')
ON CONFLICT (name) DO NOTHING;

-- Récupérer les IDs des catégories
DO $$
DECLARE
    presentation_id INTEGER;
    services_id INTEGER;
    contact_id INTEGER;
    horaires_id INTEGER;
    equipe_id INTEGER;
    faq_id INTEGER;
BEGIN
    SELECT id INTO presentation_id FROM knowledge_categories WHERE name = 'Présentation';
    SELECT id INTO services_id FROM knowledge_categories WHERE name = 'Services';
    SELECT id INTO contact_id FROM knowledge_categories WHERE name = 'Contact';
    SELECT id INTO horaires_id FROM knowledge_categories WHERE name = 'Horaires';
    SELECT id INTO equipe_id FROM knowledge_categories WHERE name = 'Équipe';
    SELECT id INTO faq_id FROM knowledge_categories WHERE name = 'FAQ';

    -- Présentation de l'entreprise
    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'À propos de Yonetwork',
        'Yonetwork est une entreprise innovante spécialisée dans les solutions de communication et de réseautage professionnel. Fondée en 2020, notre mission est de connecter les professionnels et les entreprises à travers des outils technologiques avancés et accessibles. Nous sommes engagés à fournir des services de haute qualité qui favorisent la collaboration et la croissance de nos clients.',
        presentation_id,
        ARRAY['présentation', 'entreprise', 'mission', 'yonetwork']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Histoire de Yonetwork',
        'Yonetwork a été fondée en 2020 par une équipe d''experts en technologie et en communication. Partant du constat que les solutions de réseautage professionnel existantes ne répondaient pas aux besoins des petites et moyennes entreprises, nous avons développé une plateforme intuitive et abordable. Depuis notre création, nous avons connu une croissance constante et avons étendu notre offre de services pour répondre aux besoins évolutifs de nos clients.',
        presentation_id,
        ARRAY['histoire', 'fondation', 'création', 'yonetwork']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Valeurs de Yonetwork',
        'Chez Yonetwork, nous sommes guidés par des valeurs fortes : l''innovation, l''accessibilité, la transparence et l''excellence. Nous croyons que la technologie doit être au service des personnes, et non l''inverse. Nous nous efforçons de créer des solutions qui simplifient la vie professionnelle de nos utilisateurs tout en respectant leur vie privée et leurs données.',
        presentation_id,
        ARRAY['valeurs', 'mission', 'vision', 'yonetwork']
    );

    -- Services
    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Services de communication',
        'Yonetwork propose une gamme complète de services de communication pour les entreprises : messagerie instantanée sécurisée, visioconférence HD, partage de documents en temps réel, et intégration avec les outils professionnels existants. Nos solutions sont disponibles sur tous les appareils et optimisées pour une utilisation professionnelle.',
        services_id,
        ARRAY['services', 'communication', 'messagerie', 'visioconférence']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Réseautage professionnel',
        'Notre plateforme de réseautage professionnel permet aux utilisateurs de créer et développer leur réseau professionnel de manière efficace. Grâce à nos algorithmes avancés, nous mettons en relation les professionnels partageant des intérêts communs ou des opportunités de collaboration. Les utilisateurs peuvent créer un profil détaillé, participer à des groupes thématiques, et découvrir des événements professionnels pertinents.',
        services_id,
        ARRAY['services', 'réseautage', 'networking', 'professionnel']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Formation et accompagnement',
        'Yonetwork propose des services de formation et d''accompagnement pour aider les entreprises à tirer le meilleur parti de nos solutions. Nos experts peuvent former vos équipes à l''utilisation de nos outils, vous conseiller sur les meilleures pratiques, et vous aider à intégrer nos solutions dans votre environnement de travail existant.',
        services_id,
        ARRAY['services', 'formation', 'accompagnement', 'conseil']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Tarifs et abonnements',
        'Yonetwork propose plusieurs formules d''abonnement adaptées aux besoins des différentes entreprises : Starter (19€/mois pour les indépendants et micro-entreprises), Business (49€/mois jusqu''à 20 utilisateurs), et Enterprise (sur devis pour les grandes entreprises). Tous nos abonnements incluent le support technique et les mises à jour régulières. Nous proposons également une période d''essai gratuite de 30 jours pour tester nos services.',
        services_id,
        ARRAY['tarifs', 'prix', 'abonnements', 'offres']
    );

    -- Contact
    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Coordonnées',
        'Vous pouvez contacter Yonetwork par téléphone au 01 23 45 67 89 (du lundi au vendredi, de 9h à 18h) ou par email à contact@yonetwork.com. Notre équipe de support est disponible pour répondre à toutes vos questions.',
        contact_id,
        ARRAY['contact', 'téléphone', 'email', 'coordonnées']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Adresse et localisation',
        'Le siège social de Yonetwork est situé au 123 Avenue de la République, 75011 Paris, France. Nos bureaux sont facilement accessibles en transport en commun (métro République ou Oberkampf).',
        contact_id,
        ARRAY['adresse', 'localisation', 'bureaux', 'siège']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Support technique',
        'Notre équipe de support technique est disponible par email à support@yonetwork.com ou par téléphone au 01 23 45 67 90. Pour les clients avec un abonnement Business ou Enterprise, un support prioritaire est disponible 24h/24 et 7j/7.',
        contact_id,
        ARRAY['support', 'assistance', 'technique', 'aide']
    );

    -- Horaires
    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Horaires d''ouverture',
        'Nos bureaux sont ouverts du lundi au vendredi, de 9h à 18h. Nos équipes commerciales et de support sont disponibles pendant ces horaires pour répondre à vos questions et vous accompagner dans l''utilisation de nos services.',
        horaires_id,
        ARRAY['horaires', 'ouverture', 'disponibilité', 'bureau']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Disponibilité des services',
        'Les services en ligne de Yonetwork sont disponibles 24h/24 et 7j/7. Nous effectuons des maintenances régulières pour améliorer nos services, généralement pendant les heures creuses (entre 2h et 5h du matin) avec un préavis de 48h pour les interventions planifiées.',
        horaires_id,
        ARRAY['disponibilité', 'services', 'maintenance', 'accès']
    );

    -- Équipe
    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Notre équipe',
        'L''équipe de Yonetwork est composée de professionnels passionnés et expérimentés dans les domaines de la technologie, de la communication et du développement commercial. Dirigée par Sophie Martin (CEO) et Thomas Dubois (CTO), notre équipe compte aujourd''hui 25 collaborateurs répartis entre nos départements de développement, design, support client, marketing et ventes.',
        equipe_id,
        ARRAY['équipe', 'collaborateurs', 'employés', 'direction']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Recrutement',
        'Yonetwork est en constante croissance et nous recherchons régulièrement de nouveaux talents pour rejoindre notre équipe. Vous pouvez consulter nos offres d''emploi sur notre site web dans la section "Carrières" ou nous envoyer votre candidature spontanée à recrutement@yonetwork.com.',
        equipe_id,
        ARRAY['recrutement', 'emploi', 'carrière', 'candidature']
    );

    -- FAQ
    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Comment créer un compte Yonetwork ?',
        'Pour créer un compte Yonetwork, rendez-vous sur notre site web www.yonetwork.com et cliquez sur "S''inscrire". Vous pouvez créer un compte avec votre adresse email professionnelle ou vous connecter avec votre compte Google ou Microsoft. Après avoir rempli le formulaire d''inscription, vous recevrez un email de confirmation pour activer votre compte.',
        faq_id,
        ARRAY['compte', 'inscription', 'création', 'faq']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Comment contacter le support client ?',
        'Vous pouvez contacter notre support client par email à support@yonetwork.com, par téléphone au 01 23 45 67 90 (du lundi au vendredi, de 9h à 18h), ou via le chat en direct disponible sur notre site web et dans notre application.',
        faq_id,
        ARRAY['support', 'contact', 'aide', 'faq']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Comment annuler mon abonnement ?',
        'Pour annuler votre abonnement, connectez-vous à votre compte Yonetwork, accédez à la section "Paramètres" puis "Abonnement", et cliquez sur "Gérer mon abonnement". Vous pouvez y annuler le renouvellement automatique. Votre abonnement restera actif jusqu''à la fin de la période en cours. Si vous rencontrez des difficultés, n''hésitez pas à contacter notre support client.',
        faq_id,
        ARRAY['abonnement', 'annulation', 'résiliation', 'faq']
    );

    INSERT INTO knowledge_articles (title, content, category_id, tags)
    VALUES (
        'Les données sont-elles sécurisées ?',
        'Oui, la sécurité des données est une priorité chez Yonetwork. Toutes les données sont chiffrées en transit et au repos, nous utilisons des protocoles de sécurité avancés, et nos serveurs sont hébergés dans des centres de données certifiés ISO 27001. Nous sommes conformes au RGPD et ne partageons jamais vos données avec des tiers sans votre consentement explicite.',
        faq_id,
        ARRAY['sécurité', 'données', 'confidentialité', 'rgpd']
    );
END $$; 