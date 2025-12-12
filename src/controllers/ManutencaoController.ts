import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { manutencaoSchema } from '../schemas/operacao.schemas';
import { Prisma } from '@prisma/client'; // Import necessário para tipagem

// Extraímos o tipo limpo do schema
type ManutencaoData = z.infer<typeof manutencaoSchema>['body'];

export class ManutencaoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const encarregadoId = req.user?.userId;
        if (!encarregadoId) return res.status(401).json({ error: 'Auth error' });

        try {
            const dados = req.body as ManutencaoData;

            // Auditoria de KM (Apenas log se retroativo)
            if (dados.veiculoId && dados.kmAtual) {
                const ultimoKM = await KmService.getUltimoKMRegistrado(dados.veiculoId);
                if (dados.kmAtual < ultimoKM) {
                    console.warn(`[Manutenção] Retroativo: KM ${dados.kmAtual} < ${ultimoKM}`);
                }
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

            const novaOS = await prisma.$transaction(async (tx) => {
                return await tx.ordemServico.create({
                    data: {
                        ...(dados.veiculoId ? { veiculo: { connect: { id: dados.veiculoId } } } : {}),
                        fornecedor: { connect: { id: dados.fornecedorId } },
                        encarregado: { connect: { id: encarregadoId } },
                        kmAtual: dados.kmAtual ?? null,
                        data: dados.data,
                        tipo: dados.tipo,
                        custoTotal: custoTotalGeral,
                        observacoes: dados.observacoes ?? null,
                        fotoComprovanteUrl: dados.fotoComprovanteUrl ?? null,
                        itens: { create: itensParaCriar },
                    },
                    include: { itens: { include: { produto: true } } },
                });
            });

            res.status(201).json(novaOS);
        } catch (error) {
            console.error("Erro criar OS:", error);
            res.status(500).json({ error: 'Erro ao registrar manutenção' });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido.' });

        const dados = req.body as ManutencaoData;

        try {
            const osAtualizada = await prisma.$transaction(async (tx) => {
                
                // 1. Verifica existência
                const exists = await tx.ordemServico.findUnique({ where: { id } });
                if (!exists) throw new Error("RECORD_NOT_FOUND");

                // 2. Recalcula totais
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

                // 3. Remove itens antigos
                await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });

                // 4. Atualiza OS
                return await tx.ordemServico.update({
                    where: { id },
                    data: {
                        veiculoId: dados.veiculoId || null,
                        fornecedorId: dados.fornecedorId,
                        kmAtual: dados.kmAtual ?? null,
                        data: dados.data,
                        tipo: dados.tipo,
                        custoTotal: custoTotalGeral,
                        observacoes: dados.observacoes ?? null,
                        ...(dados.fotoComprovanteUrl !== undefined ? { fotoComprovanteUrl: dados.fotoComprovanteUrl } : {}),
                        itens: { create: itensParaCriar }
                    },
                    include: { itens: { include: { produto: true } } }
                });
            });

            res.json(osAtualizada);
        } catch (error: any) {
            if (error.message === "RECORD_NOT_FOUND") return res.status(404).json({ error: "OS não encontrada." });
            console.error("Erro update OS:", error);
            res.status(500).json({ error: 'Erro ao atualizar.' });
        }
    }

    static async listRecent(req: Request, res: Response) {
        try {
            const { dataInicio, dataFim, veiculoId, limit } = req.query;
            
            // Construção tipada do filtro 'where'
            const where: Prisma.OrdemServicoWhereInput = {};

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
                    where.data = dateFilter;
                }
            }

            if (veiculoId && typeof veiculoId === 'string') {
                where.veiculoId = veiculoId;
            }

            // Construção explícita das opções para evitar erros de tipo com 'exactOptionalPropertyTypes'
            const options: Prisma.OrdemServicoFindManyArgs = {
                where,
                orderBy: { data: 'desc' },
                include: {
                    // Importante: 'id: true' para que o frontend receba o ID do veículo
                    veiculo: { select: { id: true, placa: true, modelo: true } },
                    encarregado: { select: { nome: true } },
                    fornecedor: { select: { nome: true } },
                    itens: { include: { produto: { select: { nome: true } } } }
                }
            };

            // Aplica o limite se não for 'all'
            if (limit !== 'all') {
                options.take = 50;
            }

            const recentes = await prisma.ordemServico.findMany(options);
            res.json(recentes);
        } catch (error) {
            console.error("Erro listRecent:", error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas ADMIN.' });
        
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido.' });

        try {
            await prisma.$transaction(async (tx) => {
                const exists = await tx.ordemServico.findUnique({ where: { id } });
                if (!exists) throw new Error("RECORD_NOT_FOUND");

                await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });
                await tx.ordemServico.delete({ where: { id } });
            });
            res.json({ message: 'Removido.' });
        } catch (error: any) {
            if (error.message === "RECORD_NOT_FOUND") return res.status(404).json({ error: "OS não encontrada." });
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}