import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance and Security Optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@libsql/isomorphic-ws"],
    outputFileTracingIncludes: {
      '/**/*': ['./node_modules/@libsql/isomorphic-ws/**/*'],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    minimumCacheTTL: 60,
  },
  webpack: (config, { isServer, nextRuntime }) => {
    config.infrastructureLogging = {
      level: 'error',
    };
    if (nextRuntime === 'edge') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        url: false,
        crypto: false,
        canvas: false,
        path2d: false
      };
    }
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        jspdf: false,
        'jspdf-autotable': false,
        xlsx: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://res.cloudinary.com https://api.qrserver.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.qrserver.com wss://*.pusher.com https://*.pusher.com https://*.googleapis.com; frame-src 'self' https://www.youtube.com https://*.youtube.com https://www.google.com https://maps.google.com; worker-src 'self' blob:; frame-ancestors 'none';",
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=()',
          }
        ],
      },
    ];
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default analyzer(nextConfig);
