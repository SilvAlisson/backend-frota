import { prisma } from '../lib/prisma';

export class PrevisaoService {
    /**
     * Calcula a média de KM rodado por dia nos últimos 30 dias.
     */
    static async calcularMediaDiaria(veiculoId: string): Promise<number> {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        const jornadas = await prisma.jornada.findMany({
            where: {
                veiculoId,
                dataInicio: { gte: trintaDiasAtras },
                kmFim: { not: null }
            },
            select: { kmInicio: true, kmFim: true }
        });

        const kmTotal = jornadas.reduce((acc, j) => acc + ((j.kmFim || 0) - j.kmInicio), 0);

        // Retorna média (mínimo 1km para evitar divisão por zero)
        return Math.max(kmTotal / 30, 1);
    }

    /**
     * Estima em quantos dias o veículo atingirá o KM da próxima manutenção
     * RENOMEADO: de estimarDiasParaKm para estimarDiasParaManutencao
     */
    static async estimarDiasParaManutencao(veiculoId: string, kmAlvo: number, kmAtual: number): Promise<number | null> {
        if (kmAlvo <= kmAtual) return 0;

        const kmRestante = kmAlvo - kmAtual;
        const mediaDiaria = await this.calcularMediaDiaria(veiculoId);

        return Math.ceil(kmRestante / mediaDiaria);
    }
}