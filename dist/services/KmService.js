"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KmService = void 0;
const prisma_1 = require("../lib/prisma");
class KmService {
    static async registrarKm(veiculoId, km, origem, origemId) {
        if (!veiculoId || !km)
            return;
        try {
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
        }
    }
    static async getUltimoKMRegistrado(veiculoId) {
        try {
            const historico = await prisma_1.prisma.historicoKm.findFirst({
                where: { veiculoId },
                orderBy: { km: 'desc' },
                select: { km: true }
            });
            if (historico)
                return historico.km;
            return 0;
        }
        catch (error) {
            console.error(`[CRITICAL] Falha ao validar KM do veículo ${veiculoId}:`, error);
            return 0;
        }
    }
}
exports.KmService = KmService;
//# sourceMappingURL=KmService.js.map