const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const departments = ['대표이사 (CEO)', '경영지원본부', 'R&D센터', '사업총괄본부'];

    console.log("Seeding departments...");

    for (const name of departments) {
        const res = await prisma.department.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        console.log(`Upserted: ${res.name}`);
    }

    console.log('Departments seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
