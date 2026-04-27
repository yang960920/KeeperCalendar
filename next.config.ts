import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Prisma 엔진 바이너리(src/generated/prisma 하위)를 서버리스 함수 번들에 포함시키기 위한 trace include 설정
  // 새 prisma-client generator가 node_modules가 아닌 프로젝트 경로에 출력하므로, Next 자동 추적이 누락하는 .node 바이너리를 명시 등록한다
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
