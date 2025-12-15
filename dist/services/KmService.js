"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KmService = void 0;
const prisma_1 = require("../lib/prisma");
class KmService {
    static async registrarKm(veiculoId, km, origem, origemId) {
        if (!veiculoId || !km)
            return;
        try {
            // Grava no histórico imutável para auditoria e previsão
            await prisma_1.prisma.historicoKm.create({
                data: {
                    veiculoId,
                    km,
                    origem,
                    origemId: origemId ?? null,
                    dataLeitura: new Date()
                }
            });
        }
        catch (error) {
            console.error(`[WARN] Falha ao registrar histórico de KM para o veículo ${veiculoId}`, error);
            // Não lançamos erro para não travar a operação principal (fail-open)
        }
    }
    /**
     * Busca o MAIOR KM registrado para um veículo usando a tabela Otimizada (HistoricoKm).
     */
    static async getUltimoKMRegistrado(veiculoId) {
        try {
            // 1. Busca na tabela inteligente (Indexada e Rápida)
            const historico = await prisma_1.prisma.historicoKm.findFirst({
                where: { veiculoId },
                orderBy: { km: 'desc' }, // Pega o maior valor absoluto
                select: { km: true }
            });
            if (historico)
                return historico.km;
            // Se não tiver histórico nenhum, retorna 0
            return 0;
        }
        catch (error) {
            console.error(`[CRITICAL] Falha ao validar KM do veículo ${veiculoId}:`, error);
            // Retorna 0 para não bloquear a operação em caso de falha de banco
            return 0;
        }
    }
}
exports.KmService = KmService;
//# sourceMappingURL=KmService.js.map