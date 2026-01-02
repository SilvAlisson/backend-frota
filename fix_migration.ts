import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Limpando histórico de migração problemática...');

    // Deleta o registro da migração que não existe mais localmente
    const result = await prisma.$executeRawUnsafe(`
    DELETE FROM "_prisma_migrations" 
    WHERE "migration_name" = '20250101120000_fix_drift_manual';
  `);

    console.log(`✅ Resultado: ${result} registro(s) removido(s).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });