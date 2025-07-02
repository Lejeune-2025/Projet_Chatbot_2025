/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                // Appliquer ces headers à toutes les routes API
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: 'http://localhost:8081'
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS'
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Content-Type, Accept, Origin, X-Requested-With, Authorization, X-Platform, X-App-Version, X-Nonce'
                    },
                    {
                        key: 'Access-Control-Allow-Credentials',
                        value: 'true'
                    },
                    {
                        key: 'Access-Control-Max-Age',
                        value: '86400'
                    },
                    {
                        key: 'Vary',
                        value: 'Origin'
                    }
                ]
            }
        ];
    },
    // Configuration supplémentaire pour le développement
    webpack: (config, { dev, isServer }) => {
        // Optimisations pour le développement
        if (dev && !isServer) {
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
            };
        }
        return config;
    }
};

export default nextConfig;
