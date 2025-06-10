/** @type {import('next').NextConfig} */

const nextConfig = {
  distDir: "build",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// Add tempo-devtools configuration when in development
if (process.env.NEXT_PUBLIC_TEMPO && process.env.NODE_ENV === "development") {
  try {
    nextConfig["experimental"] = {
      swcPlugins: [[require.resolve("tempo-devtools/swc/0.90"), {}]],
    };
  } catch (error) {
    console.warn("Failed to load tempo-devtools SWC plugin:", error);
  }
}

module.exports = nextConfig;
