"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaService = void 0;
// src/services/JornadaService.ts
const prisma_1 = require("../lib/prisma");
class JornadaService {
    /**
     * Verifica todas as jornadas abertas e fecha as que excederam 17h.
     * Deve ser chamado por um Cron Job ou Trigger.
     */
    static async fecharJornadasVencidas() {
        console.log('🕒 [Cron] Verificando jornadas excedidas (Timeout 17h)...');
        const agora = new Date();
        // Busca jornadas abertas (kmFim nulo)
        const jornadasAbertas = await prisma_1.prisma.jornada.findMany({
            where: { kmFim: null, dataFim: null },
            select: { id: true, dataInicio: true, kmInicio: true, observacoes: true }
        });
        let fechadasCount = 0;
        for (const jornada of jornadasAbertas) {
            const horasPassadas = (agora.getTime() - new Date(jornada.dataInicio).getTime()) / (1000 * 60 * 60);
            if (horasPassadas > 17) {
                // FECHAMENTO PROVISÓRIO (Cenário C - Parte 1)
                // Fechamos com o mesmo KM de início (0 km rodados "teoricamente")
                // Marcamos na observação para o próximo motorista corrigir
                await prisma_1.prisma.jornada.update({
                    where: { id: jornada.id },
                    data: {
                        kmFim: jornada.kmInicio,
                        dataFim: agora,
                        observacoes: (jornada.observacoes || '') + ' [SYSTEM_AUTO_CLOSE] Fechamento automático por inatividade.'
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