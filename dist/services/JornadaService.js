"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaService = void 0;
const prisma_1 = require("../lib/prisma");
class JornadaService {
    /**
     * Verifica todas as jornadas abertas e fecha as que excederam 17h.
     * Deve ser chamado por um Cron Job ou Trigger.
     */
    static async fecharJornadasVencidas() {
        console.log('🕒 [Cron] Verificando jornadas excedidas (Timeout 17h)...');
        const agora = new Date();
        // Busca jornadas abertas
        const jornadasAbertas = await prisma_1.prisma.jornada.findMany({
            where: { kmFim: null, dataFim: null },
            select: { id: true, dataInicio: true, kmInicio: true, observacoes: true }
        });
        let fechadasCount = 0;
        for (const jornada of jornadasAbertas) {
            const horasPassadas = (agora.getTime() - new Date(jornada.dataInicio).getTime()) / (1000 * 60 * 60);
            if (horasPassadas > 17) {
                await prisma_1.prisma.jornada.update({
                    where: { id: jornada.id },
                    data: {
                        kmFim: jornada.kmInicio, // Assume KM inicial (regra de negócio de segurança)
                        dataFim: agora,
                        observacoes: (jornada.observacoes || '') + ' [Fechada automaticamente: Timeout 17h]'
                    }
                });
                fechadasCount++;
            }
        }
        if (fechadasCount > 0) {
            console.log(`✅ [Cron] ${fechadasCount} jornadas foram fechadas automaticamente.`);
        }
    }
}
exports.JornadaService = JornadaService;
//# sourceMappingURL=JornadaService.js.map