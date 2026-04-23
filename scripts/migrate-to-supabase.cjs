/**
 * Neon → Supabase 이전 스크립트 (User + Department 만 복사)
 * 실행: node scripts/migrate-to-supabase.cjs
 *
 * .env.local 에 OLD_DATABASE_URL / NEW_DATABASE_URL 필요.
 */

const { PrismaClient } = require(".prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const OLD_URL = process.env.OLD_DATABASE_URL;
const NEW_URL = process.env.NEW_DATABASE_URL;

if (!OLD_URL || !NEW_URL) {
    console.error("❌ .env.local 에 OLD_DATABASE_URL / NEW_DATABASE_URL 을 추가하세요.");
    process.exit(1);
}

const oldDb = new PrismaClient({ datasourceUrl: OLD_URL });
const newDb = new PrismaClient({ datasourceUrl: NEW_URL });

async function main() {
    console.log("── Neon → Supabase 이전 시작 ──\n");

    const existingUsers = await newDb.user.count();
    if (existingUsers > 0) {
        console.log(`⚠️ 새 DB에 이미 ${existingUsers} 명의 사용자가 있습니다. 중단합니다.`);
        return;
    }

    const depts = await oldDb.department.findMany();
    console.log(`📂 부서 ${depts.length}개 복사 중...`);
    for (const d of depts) {
        await newDb.department.create({
            data: {
                id: d.id,
                name: d.name,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            },
        });
    }
    console.log(`   ✓ 부서 복사 완료`);

    const users = await oldDb.user.findMany();
    console.log(`👥 사용자 ${users.length}명 복사 중...`);
    for (const u of users) {
        await newDb.user.create({
            data: {
                id: u.id,
                name: u.name,
                password: u.password,
                employeeCode: u.employeeCode,
                role: u.role,
                departmentId: u.departmentId,
                resumeUrl: u.resumeUrl,
                profileImageUrl: u.profileImageUrl,
                workStartTime: u.workStartTime,
                workEndTime: u.workEndTime,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            },
        });
    }
    console.log(`   ✓ 사용자 복사 완료`);

    const settings = await oldDb.userSettings.findMany();
    if (settings.length > 0) {
        console.log(`⚙️ UserSettings ${settings.length}개 복사 중...`);
        for (const s of settings) {
            await newDb.userSettings.create({ data: s });
        }
        console.log(`   ✓ UserSettings 복사 완료`);
    }

    const [newDepts, newUsers] = await Promise.all([
        newDb.department.count(),
        newDb.user.count(),
    ]);
    console.log(`\n── 검증 ──`);
    console.log(`   부서: 구 ${depts.length} → 신 ${newDepts} ${depts.length === newDepts ? "✅" : "❌"}`);
    console.log(`   사용자: 구 ${users.length} → 신 ${newUsers} ${users.length === newUsers ? "✅" : "❌"}`);
    console.log(`\n✨ 이전 완료. 이제 Vercel 환경변수를 새 URL로 교체하세요.`);
}

main()
    .catch((e) => {
        console.error("❌ 오류:", e);
        process.exit(1);
    })
    .finally(async () => {
        await oldDb.$disconnect();
        await newDb.$disconnect();
    });
