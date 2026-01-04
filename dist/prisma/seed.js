"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// prisma/seed.ts
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando Seed do Banco de Dados...');
    // ======================================================
    // 0. CONFIGURAÇÕES DO SISTEMA
    // ======================================================
    const configExists = await prisma.configuracaoSistema.findFirst();
    if (!configExists) {
        await prisma.configuracaoSistema.create({
            data: {
                diasAntecedenciaAlerta: 30,
                kmAntecedenciaAlerta: 1500
            }
        });
        console.log('⚙️ Configurações iniciais aplicadas.');
    }
    // ======================================================
    // 1. O "BOT FANTASMA"
    // ======================================================
    const emailBot = 'sistema@frota.ghost';
    const botExists = await prisma.user.findUnique({ where: { email: emailBot } });
    if (!botExists) {
        console.log('👻 Invocando entidade sobrenatural...');
        const passwordHash = await (0, bcryptjs_1.hash)('ghost-bot-secure-password-2025', 8);
        await prisma.user.create({
            data: {
                nome: 'ASSOMBRAÇÃO DO SISTEMA',
                email: emailBot,
                password: passwordHash,
                matricula: '666-GHOST',
                role: client_1.UserRole.BOT,
                fotoUrl: 'https://cdn-icons-png.flaticon.com/512/1236/1236413.png',
                profile: {
                    create: {
                        dataAdmissao: new Date(),
                        cnhNumero: null, // Bot não dirige (legalmente)
                    }
                }
            }
        });
        console.log('✅ Usuário Fantasma criado com sucesso!');
    }
    else {
        console.log('ℹ️ O Fantasma já habita este banco.');
    }
    // ======================================================
    // 2. ADMIN PADRÃO
    // ======================================================
    const emailAdmin = 'admin@frota.com';
    const adminExists = await prisma.user.findUnique({ where: { email: emailAdmin } });
    if (!adminExists) {
        const adminPass = await (0, bcryptjs_1.hash)('123456', 8);
        await prisma.user.create({
            data: {
                nome: 'Administrador Supremo',
                email: emailAdmin,
                password: adminPass,
                role: client_1.UserRole.ADMIN,
                matricula: '001',
                fotoUrl: 'https://cdn-icons-png.flaticon.com/512/2942/2942813.png',
                profile: {
                    create: {
                        dataAdmissao: new Date(),
                        cnhNumero: '00000000000'
                    }
                }
            }
        });
        console.log('✅ Admin padrão criado: admin@frota.com / 123456');
    }
    console.log('🏁 Seed finalizado com sucesso!');
}
main()
    .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map