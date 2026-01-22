/**
 * Next.js Configuration for MCD-Agencia
 *
 * This configuration file sets up:
 * - Internationalization (ES/EN)
 * - Image optimization
 * - API rewrites
 * - Security headers
 *
 * @see https://nextjs.org/docs/api-reference/next.config.js/introduction
 */

const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ==========================================================================
  // React Configuration
  // ==========================================================================
  reactStrictMode: true,

  // ==========================================================================
  // Image Optimization
  // ==========================================================================
  images: {
    // Allow images from external domains
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 'agenciamcd.mx',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Supported image formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for next/image
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ==========================================================================
  // API Rewrites (Proxy to Backend)
  // ==========================================================================
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  // ==========================================================================
  // Security Headers
  // ==========================================================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },

  // ==========================================================================
  // Experimental Features
  // ==========================================================================
  experimental: {
    // Server actions are available by default - no need to configure
  },

  // ==========================================================================
  // Webpack Configuration
  // ==========================================================================
  webpack: (config, { isServer }) => {
    // Add custom webpack configurations here if needed
    return config;
  },

  // ==========================================================================
  // Environment Variables
  // ==========================================================================
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  // ==========================================================================
  // Output Configuration
  // ==========================================================================
  output: 'standalone',

  // ==========================================================================
  // Powered By Header
  // ==========================================================================
  poweredByHeader: false,
};

module.exports = withNextIntl(nextConfig);
