/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Las fotos se envían por multipart a /api/deliveries, no por server actions,
      // pero dejamos el límite alineado por si se agregan más adelante.
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
