const { PrismaClient } = require(".prisma/client");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

(async () => {
    const prisma = new PrismaClient();
    try {
        const [users, depts] = await Promise.all([
            prisma.user.count(),
            prisma.department.count(),
        ]);
        console.log(`✅ DB OK — 사용자 ${users}명 / 부서 ${depts}개`);
    } catch (e) {
        console.error("❌ DB 연결 실패:", e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();
