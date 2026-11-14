/** @type {import("next").NextConfig} */
// TARAZU_DIST lets a production build live beside a running dev server.
const config = { reactStrictMode: true, transpilePackages: ["three"], devIndicators: false, distDir: process.env.TARAZU_DIST || ".next" };
export default config;
