/**
 * Prisma 엔진 바이너리를 .next/server/chunks/ 로 복사하는 후처리 스크립트.
 *
 * 배경:
 *   새 prisma-client generator는 출력물(client.ts)이 src/generated/prisma 안에 만들어지고,
 *   이 파일은 import.meta.url 기반으로 자기 위치를 잡아 엔진 바이너리(.node) 경로를 추정한다.
 *   webpack/Turbopack 모두 이 파일을 .next/server/chunks/<hash>.js 로 인라이닝하므로,
 *   런타임에서 import.meta.url 은 청크 위치를 가리키게 되고 Prisma 는 .next/server/chunks/
 *   주변에서 엔진 바이너리를 찾는다 — 그런데 거기엔 .so 파일이 없어 실패한다.
 *
 * 해결:
 *   빌드 직후, src/generated/prisma/ 안의 *.node 엔진 바이너리들을
 *   .next/server/chunks/ 와 .next/standalone(있다면) 경로로 복사한다.
 *   이렇게 하면 Prisma 의 첫 탐색 경로(/var/task/.next/server/chunks)에서 바로 발견된다.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "src", "generated", "prisma");
const TARGETS = [
    path.join(ROOT, ".next", "server", "chunks"),
];

function findEngineBinaries(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".node") && (f.includes("libquery_engine") || f.includes("query_engine")));
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function main() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.warn(`[copy-prisma-engine] source not found: ${SOURCE_DIR} — skipping`);
        return;
    }

    const binaries = findEngineBinaries(SOURCE_DIR);
    if (binaries.length === 0) {
        console.warn(`[copy-prisma-engine] no engine binaries in ${SOURCE_DIR} — skipping`);
        return;
    }

    let copied = 0;
    for (const target of TARGETS) {
        if (!fs.existsSync(path.dirname(target))) continue;
        ensureDir(target);
        for (const file of binaries) {
            const src = path.join(SOURCE_DIR, file);
            const dst = path.join(target, file);
            fs.copyFileSync(src, dst);
            copied += 1;
            console.log(`[copy-prisma-engine] ${file} → ${path.relative(ROOT, dst)}`);
        }
    }

    if (copied === 0) {
        console.warn("[copy-prisma-engine] no copies performed (no target dirs existed)");
    } else {
        console.log(`[copy-prisma-engine] done — ${copied} file(s) copied`);
    }
}

main();
