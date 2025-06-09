/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "export", // Change from 'standalone' to 'export'
  distDir: "build",
  trailingSlash: true, // Add this for better routing
  images: {
    unoptimized: true, // Required for static export
  },
};

if (process.env.NEXT_PUBLIC_TEMPO) {
  nextConfig["experimental"] = {
    // NextJS 13.4.8 up to 14.1.3:
    // swcPlugins: [[require.resolve("tempo-devtools/swc/0.86"), {}]],
    // NextJS 14.1.3 to 14.2.11:
    swcPlugins: [[require.resolve("tempo-devtools/swc/0.90"), {}]],

    // NextJS 15+ (Not yet supported, coming soon)
  };
}

module.exports = nextConfig;
