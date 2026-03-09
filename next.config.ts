import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev, // 开发模式禁用，避免 sw.js 写入触发 HMR 死循环
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  webpack(config) {
    // 忽略 public 目录下的 SW 相关文件，防止写入触发重编译循环
    config.watchOptions = {
      ignored: ["**/.git/**", "**/node_modules/**", "**/public/sw.js", "**/public/workbox-*.js"],
    };
    return config;
  },
};

export default withPWA(nextConfig);
