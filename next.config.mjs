/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        // Prevent clickjacking
        { key: 'X-Frame-Options',           value: 'DENY' },
        // Prevent MIME type sniffing
        { key: 'X-Content-Type-Options',    value: 'nosniff' },
        // Control referrer info
        { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        // Disable FLoC / permission policies
        { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        // Force HTTPS (1 year)
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        // Block reflected XSS attacks in older browsers
        { key: 'X-XSS-Protection',          value: '1; mode=block' },
        // Basic CSP — allows Supabase, OXR, self
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://openexchangerates.org wss://*.supabase.co",
            "frame-src 'self' blob: https://*.supabase.co",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ],
}

export default nextConfig