import { prisma } from '../src/lib/prisma'

async function main() {
    const departments = ['대표이사 (CEO)', '경영지원본부', 'R&D센터', '사업총괄본부', '도료사업부'];

    for (const name of departments) {
        await prisma.department.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log('Departments seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
