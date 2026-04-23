/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint the code separately (via `npm run lint`); don't fail production builds on lint-only issues.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
