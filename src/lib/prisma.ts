import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

// Vercel 런타임에서 Prisma 엔진 바이너리 경로를 명시적으로 지정.
// webpack이 client.ts를 .next/server/chunks/로 번들링하면 import.meta.url 기반 __dirname이
// 청크 디렉터리를 가리키지만, NFT 트레이스는 엔진을 /var/task/src/generated/prisma/ 에만
// 배치하므로 Prisma가 자동 탐색에 실패한다. PRISMA_QUERY_ENGINE_LIBRARY 로 직접 가리킨다.
if (process.platform === "linux" && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
        process.cwd(),
        "src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node",
    );
}

const prismaClientSingleton = () => {
    return new PrismaClient();
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
