/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint the code separately (via `npm run lint`); don't fail production builds on lint-only issues.
    ignoreDuringBuilds: true,
  },
  headers: async () => [
    {
      source: "/manifest.json",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
        { key: "Cache-Control", value: "public, max-age=3600" },
      ],
    },
    {
      source: "/icon-:size.png",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400, immutable" },
      ],
    },
  ],
};

export default nextConfig;
