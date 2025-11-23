import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';

export class ManutencaoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        // Apenas Gestores
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        // Verificação explícita do ID do utilizador logado
        const encarregadoId = req.user?.userId;
        if (!encarregadoId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        try {
            const { veiculoId, fornecedorId, kmAtual, data, tipo, itens, observacoes, fotoComprovanteUrl } = req.body;

            if (!veiculoId || !fornecedorId || !kmAtual || !data || !tipo || !itens) {
                return res.status(400).json({ error: 'Dados incompletos.' });
            }

            const kmAtualFloat = parseFloat(kmAtual);

            // Validação KM
            const ultimoKM = await KmService.getUltimoKMRegistrado(veiculoId);
            if (kmAtualFloat < ultimoKM) {
                return res.status(400).json({ error: `KM (${kmAtualFloat}) menor que o histórico (${ultimoKM}).` });
            }

            let custoTotalGeral = 0;
            const itensParaCriar = itens.map((item: any) => {
                const total = parseFloat(item.quantidade) * parseFloat(item.valorPorUnidade);
                custoTotalGeral += total;
                return {
                    produtoId: item.produtoId,
                    quantidade: parseFloat(item.quantidade),
                    valorPorUnidade: parseFloat(item.valorPorUnidade),
                    valorTotal: total,
                };
            });

            const novaOS = await prisma.ordemServico.create({
                data: {
                    veiculo: { connect: { id: veiculoId } },
                    fornecedor: { connect: { id: fornecedorId } },
                    encarregado: { connect: { id: encarregadoId } }, // Agora é seguro (string)
                    kmAtual: kmAtualFloat,
                    data: new Date(data),
                    tipo,
                    custoTotal: custoTotalGeral,
                    observacoes,
                    fotoComprovanteUrl,
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
            // Deletar itens primeiro (cascade manual se necessário ou pelo schema)
            await prisma.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });
            await prisma.ordemServico.delete({ where: { id } });
            res.json({ message: 'Manutenção removida.' });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao remover registo.' });
        }
    }
}