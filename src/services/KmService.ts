import { prisma } from '../lib/prisma';

export class KmService {
    /**
     * Busca o MAIOR KM registado para um veículo.
     * @throws Error se houver falha na comunicação com o banco.
     */
    static async getUltimoKMRegistrado(veiculoId: string): Promise<number> {
        try {
            // 1. Busca o maior KM de Jornada (kmFim)
            const ultimaJornada = await prisma.jornada.findFirst({
                where: { veiculoId: veiculoId, kmFim: { not: null } },
                orderBy: { kmFim: 'desc' },
                select: { kmFim: true }
            });

            // 2. Busca o maior KM de Abastecimento
            const ultimoAbastecimento = await prisma.abastecimento.findFirst({
                where: { veiculoId: veiculoId },
                orderBy: { kmOdometro: 'desc' },
                select: { kmOdometro: true }
            });

            // 3. Busca o maior KM de Ordem de Serviço
            const ultimaOS = await prisma.ordemServico.findFirst({
                where: { veiculoId: veiculoId },
                orderBy: { kmAtual: 'desc' },
                select: { kmAtual: true }
            });

            // 4. Compara os três e retorna o maior de todos
            const maxKmJornada = ultimaJornada?.kmFim ?? 0;
            const maxKmAbastecimento = ultimoAbastecimento?.kmOdometro ?? 0;
            const maxKmOS = ultimaOS?.kmAtual ?? 0;

            return Math.max(maxKmJornada, maxKmAbastecimento, maxKmOS);

        } catch (error) {
            // LOG PROFISSIONAL (Futuramente usar Winston/Pino)
            console.error(`[CRITICAL] Falha ao validar KM do veículo ${veiculoId}:`, error);

            // NÃO RETORNE 0. LANCE O ERRO.
            // Isso fará o Controller pegar o erro e retornar HTTP 500, impedindo a operação.
            throw new Error("Não foi possível validar a quilometragem do veículo. Operação abortada por segurança.");
        }
    }
}