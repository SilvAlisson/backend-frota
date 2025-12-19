import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { manutencaoSchema } from '../schemas/operacao.schemas';
import { Prisma } from '@prisma/client';

// Extraímos o tipo limpo do schema
type ManutencaoData = z.infer<typeof manutencaoSchema>['body'];

export class ManutencaoController {

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const encarregadoId = req.user?.userId;
            if (!encarregadoId) {
                res.status(401).json({ error: 'Auth error' });
                return;
            }

            const dados = req.body as ManutencaoData;

            // =================================================================================
            // 1. INTELIGÊNCIA: ALERTA DE GARANTIA (90 Dias)
            // =================================================================================
            if (dados.veiculoId) {
                const diasGarantia = 90;
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - diasGarantia);

                for (const item of dados.itens) {
                    const ultimaTroca = await prisma.itemOrdemServico.findFirst({
                        where: {
                            produtoId: item.produtoId,
                            ordemServico: {
                                veiculoId: dados.veiculoId,
                                data: { gte: dataLimite }
                            }
                        },
                        orderBy: { ordemServico: { data: 'desc' } },
                        include: { ordemServico: true, produto: true }
                    });

                    if (ultimaTroca) {
                        console.warn(`[Manutenção] ALERTA DE GARANTIA: Item "${ultimaTroca.produto.nome}" foi trocado em ${ultimaTroca.ordemServico.data.toLocaleDateString()}. Veículo: ${dados.veiculoId}`);
                    }
                }
            }

            // =================================================================================
            // 2. VALIDAÇÃO DE KM (AUDITORIA)
            // =================================================================================
            if (dados.veiculoId && dados.kmAtual) {
                const ultimoKM = await KmService.getUltimoKMRegistrado(dados.veiculoId);
                if (dados.kmAtual < ultimoKM) {
                    console.warn(`[Manutenção] Retroativo: KM ${dados.kmAtual} < ${ultimoKM}`);
                }
            }

            // 3. Preparação dos Itens (COM CORREÇÃO DECIMAL)
            let custoTotalGeral = 0;
            const itensParaCriar = dados.itens.map((item) => {
                const total = item.quantidade * item.valorPorUnidade;
                custoTotalGeral += total;
                return {
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    valorPorUnidade: item.valorPorUnidade,
                    valorTotal: Number(total.toFixed(2)),
                };
            });

            custoTotalGeral = Number(custoTotalGeral.toFixed(2));

            // 4. Transação (Criação)
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
            next(error);
        }
    }

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }

            const dados = req.body as ManutencaoData;

            const osAtualizada = await prisma.$transaction(async (tx) => {
                const exists = await tx.ordemServico.findUnique({ where: { id } });
                if (!exists) {
                    throw new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '5' });
                }

                let custoTotalGeral = 0;
                const itensParaCriar = dados.itens.map((item) => {
                    const total = item.quantidade * item.valorPorUnidade;
                    custoTotalGeral += total;
                    return {
                        produtoId: item.produtoId,
                        quantidade: item.quantidade,
                        valorPorUnidade: item.valorPorUnidade,
                        valorTotal: Number(total.toFixed(2)),
                    };
                });

                custoTotalGeral = Number(custoTotalGeral.toFixed(2));

                // Remove itens antigos para recriar (simples e eficaz para updates complexos)
                await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });

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
        } catch (error) {
            next(error);
        }
    }

    listRecent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { dataInicio, dataFim, veiculoId, limit } = req.query;
            const where: Prisma.OrdemServicoWhereInput = {};

            if (dataInicio || dataFim) {
                const dateFilter: Prisma.DateTimeFilter = {};
                if (dataInicio && typeof dataInicio === 'string') dateFilter.gte = new Date(dataInicio);
                if (dataFim && typeof dataFim === 'string') {
                    const fim = new Date(dataFim);
                    fim.setDate(fim.getDate() + 1);
                    dateFilter.lt = fim;
                }
                if (Object.keys(dateFilter).length > 0) where.data = dateFilter;
            }

            if (veiculoId && typeof veiculoId === 'string') where.veiculoId = veiculoId;

            const options: Prisma.OrdemServicoFindManyArgs = {
                where,
                orderBy: { data: 'desc' },
                include: {
                    veiculo: { select: { id: true, placa: true, modelo: true } },
                    encarregado: { select: { nome: true } },
                    fornecedor: { select: { nome: true } },
                    itens: { include: { produto: { select: { nome: true } } } }
                }
            };

            if (limit !== 'all') {
                options.take = 50;
            }

            const recentes = await prisma.ordemServico.findMany(options);
            res.json(recentes);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Apenas ADMIN.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }

            await prisma.$transaction(async (tx) => {
                const exists = await tx.ordemServico.findUnique({ where: { id } });
                if (!exists) {
                    throw new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: '5' });
                }

                await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });
                await tx.ordemServico.delete({ where: { id } });
            });
            res.json({ message: 'Removido.' });
        } catch (error) {
            next(error);
        }
    }
}