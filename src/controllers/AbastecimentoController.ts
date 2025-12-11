import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { abastecimentoSchema } from '../schemas/operacao.schemas';

// Extraímos o tipo inferido do corpo do schema
type AbastecimentoData = z.infer<typeof abastecimentoSchema>['body'];

export class AbastecimentoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        try {
            const dados = req.body as AbastecimentoData;

            const ultimoKM = await KmService.getUltimoKMRegistrado(dados.veiculoId);

            if (dados.kmOdometro < ultimoKM) {
                console.warn(`[Abastecimento] KM informado (${dados.kmOdometro}) é menor que o atual (${ultimoKM}). Permitido (lançamento retroativo).`);
            }

            let custoTotalGeral = 0;

            const itensParaCriar = dados.itens.map((item) => {
                const total = item.quantidade * item.valorPorUnidade;
                custoTotalGeral += total;
                return {
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    valorPorUnidade: item.valorPorUnidade,
                    valorTotal: total,
                };
            });

            const novoAbastecimento = await prisma.abastecimento.create({
                data: {
                    veiculo: { connect: { id: dados.veiculoId } },
                    operador: { connect: { id: dados.operadorId } },
                    fornecedor: { connect: { id: dados.fornecedorId } },
                    kmOdometro: dados.kmOdometro,
                    dataHora: dados.dataHora,
                    custoTotal: custoTotalGeral,

                    // Usar '?? null' para garantir que undefined vire null
                    placaCartaoUsado: dados.placaCartaoUsado ?? null,
                    observacoes: dados.observacoes ?? null,
                    justificativa: dados.justificativa ?? null,
                    fotoNotaFiscalUrl: dados.fotoNotaFiscalUrl ?? null,

                    itens: { create: itensParaCriar },
                },
                include: { itens: { include: { produto: true } } },
            });

            if (dados.kmOdometro > ultimoKM) {

            }

            res.status(201).json(novoAbastecimento);
        } catch (error) {
            console.error("Erro no abastecimento:", error);
            res.status(500).json({ error: 'Erro ao registrar abastecimento' });
        }
    }

    static async listRecent(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const { dataInicio, dataFim, veiculoId } = req.query;
            const where: Prisma.AbastecimentoWhereInput = {};

            if (dataInicio || dataFim) {
                const dateFilter: Prisma.DateTimeFilter = {};

                if (dataInicio && typeof dataInicio === 'string') {
                    dateFilter.gte = new Date(dataInicio);
                }

                if (dataFim && typeof dataFim === 'string') {
                    const fim = new Date(dataFim);
                    fim.setDate(fim.getDate() + 1);
                    dateFilter.lt = fim;
                }

                if (Object.keys(dateFilter).length > 0) {
                    where.dataHora = dateFilter;
                }
            }

            if (veiculoId && typeof veiculoId === 'string') {
                where.veiculoId = veiculoId;
            }

            const recentes = await prisma.abastecimento.findMany({
                where,
                take: 50,
                orderBy: { dataHora: 'desc' },
                include: {
                    veiculo: { select: { placa: true, modelo: true } },
                    operador: { select: { nome: true } },
                    fornecedor: { select: { nome: true } },
                    itens: { include: { produto: { select: { nome: true, tipo: true } } } }
                }
            });
            res.json(recentes);
        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido.' });

        try {
            await prisma.$transaction([
                prisma.itemAbastecimento.deleteMany({ where: { abastecimentoId: id } }),
                prisma.abastecimento.delete({ where: { id } })
            ]);

            res.json({ message: 'Abastecimento removido.' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao deletar registo.' });
        }
    }
}