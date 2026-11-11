import type { NextConfig } from "next";

// Địa chỉ backend Spring Boot. Frontend gọi /api/... → Next.js chuyển tiếp sang backend (không cần CORS)
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Cho phép mở bản dev từ điện thoại cùng mạng Wi-Fi (http://<IP máy tính>:3100).
  // Đổi mạng mà IP khác → thêm IP mới vào biến môi trường DEV_ORIGINS (cách nhau dấu phẩy).
  allowedDevOrigins: ["10.240.233.102", "192.168.*.*", "10.*.*.*", "172.*.*.*", ...(process.env.DEV_ORIGINS?.split(",") ?? [])],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
