import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const ENGINE_FILE = "libquery_engine-rhel-openssl-3.0.x.so.node";
const ENGINE_SOURCE = path.resolve(process.cwd(), "src/generated/prisma", ENGINE_FILE);

/**
 * webpack 빌드 단계에서 Prisma 엔진 바이너리를 .next/server/chunks/ 에 직접 emit.
 *
 * 배경: 새 prisma-client generator는 client.ts가 webpack에 의해 .next/server/chunks/<hash>.js 로
 * 인라이닝되며, 런타임 __dirname(=import.meta.url)이 청크 디렉터리를 가리킨다. Prisma는 이 경로에서
 * 엔진을 1순위로 탐색한다. NFT 트레이스는 webpack emit 직후 동작하므로, 이 단계에서 청크 디렉터리에
 * .node 파일을 함께 emit해두면 트레이스가 자동으로 의존성으로 인식하고 Vercel 배포에 포함시킨다.
 *
 * (post-build 복사 스크립트는 NFT 트레이스 *이후* 실행되어 Vercel 람다 번들에 포함되지 않음)
 */
class EmitPrismaEnginePlugin {
    apply(compiler: any) {
        compiler.hooks.thisCompilation.tap("EmitPrismaEnginePlugin", (compilation: any) => {
            const { Compilation, sources } = compiler.webpack;
            compilation.hooks.processAssets.tap(
                {
                    name: "EmitPrismaEnginePlugin",
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                },
                () => {
                    if (!fs.existsSync(ENGINE_SOURCE)) {
                        console.warn(`[EmitPrismaEnginePlugin] engine not found at ${ENGINE_SOURCE} — skipping`);
                        return;
                    }
                    const targetPath = `chunks/${ENGINE_FILE}`;
                    if (compilation.getAsset(targetPath)) return;
                    const buffer = fs.readFileSync(ENGINE_SOURCE);
                    compilation.emitAsset(targetPath, new sources.RawSource(buffer));
                    console.log(`[EmitPrismaEnginePlugin] emitted ${targetPath}`);
                },
            );
        });
    }
}

const nextConfig: NextConfig = {
    reactCompiler: true,
    outputFileTracingIncludes: {
        "/**/*": [
            "./src/generated/prisma/**/*",
            // webpack EmitPrismaEnginePlugin이 청크 디렉터리에 emit한 엔진 바이너리.
            // 이 경로가 Vercel 람다의 /var/task/.next/server/chunks/ 와 일치하며,
            // Prisma 런타임이 1순위로 탐색하는 위치다.
            "./.next/server/chunks/libquery_engine-rhel-openssl-3.0.x.so.node",
        ],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.plugins = config.plugins ?? [];
            config.plugins.push(new EmitPrismaEnginePlugin());
        }
        return config;
    },
};

export default nextConfig;
