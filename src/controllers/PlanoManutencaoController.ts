import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { planoManutencaoSchema } from '../schemas/planoManutencao.schemas';

// Extraímos a tipagem do schema
type CreatePlanoData = z.infer<typeof planoManutencaoSchema>['body'];

export class PlanoManutencaoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        try {
            // req.body já validado e tipado pelo middleware
            const { veiculoId, descricao, tipoIntervalo, valorIntervalo } = req.body as CreatePlanoData;

            // Busca KM atual para cálculo
            const kmAtual = await KmService.getUltimoKMRegistrado(veiculoId);

            let kmProximaManutencao: number | null = null;
            let dataProximaManutencao: Date | null = null;

            // Lógica de Negócio: Calcular vencimento
            if (tipoIntervalo === 'KM') {
                if (valorIntervalo > 0) {
                    // CORREÇÃO: Lógica de Múltiplos (Ex: 20, 40, 60...)
                    // Se kmAtual = 111.405 e intervalo = 20.000:
                    // 111.405 / 20.000 = 5.57 -> Floor = 5
                    // (5 + 1) * 20.000 = 120.000 KM (Próxima revisão correta)
                    const multiplicador = Math.floor(kmAtual / valorIntervalo) + 1;
                    kmProximaManutencao = multiplicador * valorIntervalo;
                } else {
                    kmProximaManutencao = kmAtual; // Segurança contra divisão por zero
                }
            } else if (tipoIntervalo === 'TEMPO') {
                const data = new Date();
                // valorIntervalo já é number aqui
                data.setMonth(data.getMonth() + valorIntervalo);
                dataProximaManutencao = data;
            }

            const plano = await prisma.planoManutencao.create({
                data: {
                    veiculoId,
                    descricao,
                    tipoIntervalo,
                    valorIntervalo,
                    kmProximaManutencao,
                    dataProximaManutencao,
                },
                include: {
                    veiculo: {
                        select: { placa: true, modelo: true }
                    }
                }
            });

            res.status(201).json(plano);
        } catch (error) {
            console.error("Erro ao criar plano:", error);
            res.status(500).json({ error: 'Erro ao criar plano de manutenção.' });
        }
    }

    static async list(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        try {
            const planos = await prisma.planoManutencao.findMany({
                include: {
                    veiculo: {
                        select: { placa: true, modelo: true }
                    }
                },
                orderBy: {
                    veiculo: { placa: 'asc' }
                }
            });
            res.json(planos);
        } catch (error) {
            console.error("Erro ao listar planos:", error);
            res.status(500).json({ error: 'Erro ao listar planos.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID do plano não fornecido.' });

        try {
            await prisma.planoManutencao.delete({
                where: { id }
            });
            res.status(204).send();
        } catch (error) {
            console.error("Erro ao deletar plano:", error);
            res.status(500).json({ error: 'Erro ao deletar plano.' });
        }
    }
}