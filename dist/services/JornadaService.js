"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaService = void 0;
// src/services/JornadaService.ts
const prisma_1 = require("../lib/prisma");
class JornadaService {
    /**
     * Verifica todas as jornadas abertas há mais de 17h e fecha automaticamente.
     * Otimizado para executar diretamente no Banco de Dados (sem loop em memória).
     */
    static async fecharJornadasVencidas() {
        console.log('🕒 [Cron] Verificando jornadas excedidas (Timeout 17h)...');
        // Calcula o momento limite (Agora - 17 horas)
        const dataLimite = new Date();
        dataLimite.setHours(dataLimite.getHours() - 17);
        try {
            // Executa update direto via SQL (Raw Query). 
            // Vantagem: Altera 1.000 ou 1 milhão de registros em milissegundos sem travar a RAM.
            const result = await prisma_1.prisma.$executeRaw `
                UPDATE "Jornada"
                SET 
                    "kmFim" = "kmInicio",
                    "dataFim" = NOW(),
                    "observacoes" = COALESCE("observacoes", '') || ' [SYSTEM_AUTO_CLOSE] Fechamento automático por inatividade.'
                WHERE 
                    "dataInicio" < ${dataLimite} 
                    AND "kmFim" IS NULL
                    AND "dataFim" IS NULL
            `;
            // O Prisma retorna o número de linhas afetadas
            if (result > 0) {
                console.log(`✅ [Cron] ${result} jornadas foram fechadas automaticamente.`);
            }
            else {
                console.log('ℹ️ [Cron] Nenhuma jornada vencida encontrada.');
            }
        }
        catch (error) {
            console.error('❌ [Cron] Erro crítico ao fechar jornadas:', error);
        }
    }
}
exports.JornadaService = JornadaService;
//# sourceMappingURL=JornadaService.js.map