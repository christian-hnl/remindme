/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Loaded at runtime by the import API instead of being bundled.
    serverComponentsExternalPackages: ['exceljs'],
  },
};

export default nextConfig;
