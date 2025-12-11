import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { manutencaoSchema } from '../schemas/operacao.schemas';

// Extraímos o tipo limpo do schema
type ManutencaoData = z.infer<typeof manutencaoSchema>['body'];

export class ManutencaoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        // Apenas Gestores
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const encarregadoId = req.user?.userId;
        if (!encarregadoId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        try {
            const dados = req.body as ManutencaoData;

            // Validação de KM (Opcional)
            if (dados.veiculoId) {
                if (dados.kmAtual !== null && dados.kmAtual !== undefined) {
                    const ultimoKM = await KmService.getUltimoKMRegistrado(dados.veiculoId);
                    if (dados.kmAtual < ultimoKM) {
                        return res.status(400).json({
                            error: `KM informado (${dados.kmAtual}) é menor que o histórico (${ultimoKM}).`
                        });
                    }
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

            const novaOS = await prisma.ordemServico.create({
                data: {
                    // Spread condicional para conectar veículo apenas se existir
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

            res.status(201).json(novaOS);
        } catch (error) {
            console.error("Erro criar OS:", error);
            res.status(500).json({ error: 'Erro ao registrar manutenção' });
        }
    }

    // =========================================================
    // MÉTODO UPDATE (CORRIGIDO)
    // =========================================================
    static async update(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        
        // CORREÇÃO 1: Validação explícita do ID para o TypeScript entender que é string
        if (!id) {
            return res.status(400).json({ error: 'ID não informado.' });
        }

        const dados = req.body as ManutencaoData;

        try {
            const osAtualizada = await prisma.$transaction(async (tx) => {
                
                // Recalcula totais
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

                // Remove itens antigos
                await tx.itemOrdemServico.deleteMany({
                    where: { ordemServicoId: id } // id agora é garantido como string
                });

                // Atualiza OS
                return await tx.ordemServico.update({
                    where: { id }, // id agora é garantido como string
                    data: {
                        veiculoId: dados.veiculoId || null,
                        fornecedorId: dados.fornecedorId,
                        
                        kmAtual: dados.kmAtual ?? null,
                        data: dados.data,
                        tipo: dados.tipo,
                        custoTotal: custoTotalGeral,
                        observacoes: dados.observacoes ?? null,
                        
                        // CORREÇÃO 2: Spread condicional para evitar passar 'undefined'
                        // Se dados.fotoComprovanteUrl for undefined, a chave nem entra no objeto data
                        ...(dados.fotoComprovanteUrl !== undefined ? { fotoComprovanteUrl: dados.fotoComprovanteUrl } : {}),

                        itens: {
                            create: itensParaCriar
                        }
                    },
                    include: { itens: { include: { produto: true } } }
                });
            });

            res.json(osAtualizada);

        } catch (error) {
            console.error("Erro ao atualizar OS:", error);
            res.status(500).json({ error: 'Erro ao atualizar registro de manutenção.' });
        }
    }

    static async listRecent(req: Request, res: Response) {
        try {
            const { dataInicio, dataFim, veiculoId } = req.query;
            const where: any = {};

            if (dataInicio && typeof dataInicio === 'string') {
                where.data = { gte: new Date(dataInicio) };
            }
            if (dataFim && typeof dataFim === 'string') {
                const fim = new Date(dataFim);
                fim.setDate(fim.getDate() + 1);
                where.data = { ...where.data, lt: fim };
            }
            if (veiculoId && typeof veiculoId === 'string') {
                where.veiculoId = veiculoId;
            }

            const recentes = await prisma.ordemServico.findMany({
                where,
                take: 50,
                orderBy: { data: 'desc' },
                include: {
                    veiculo: { select: { placa: true, modelo: true } },
                    encarregado: { select: { nome: true } },
                    fornecedor: { select: { nome: true } },
                    itens: { include: { produto: { select: { nome: true } } } }
                }
            });
            res.json(recentes);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas ADMIN pode deletar.' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID da OS não fornecido.' });

        try {
            await prisma.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });
            await prisma.ordemServico.delete({ where: { id } });
            res.json({ message: 'Manutenção removida.' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao remover registo.' });
        }
    }
}