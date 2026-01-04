import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { abastecimentoSchema } from '../schemas/operacao.schemas';

type AbastecimentoData = z.infer<typeof abastecimentoSchema>['body'];

export class AbastecimentoController {

    /**
     * Registra um novo abastecimento.
     */
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado. Apenas Gestores podem lançar abastecimentos.' });
                return;
            }

            const dados = req.body as AbastecimentoData;

            const veiculo = await prisma.veiculo.findUnique({ where: { id: dados.veiculoId } });
            if (!veiculo) {
                res.status(404).json({ error: "Veículo não encontrado." });
                return;
            }

            // BLINDAGEM DE COMBUSTÍVEL
            const itensComDetalhes = await Promise.all(dados.itens.map(async (item) => {
                const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
                return { ...item, produto };
            }));

            const combustivelErrado = itensComDetalhes.find(item => {
                if (item.produto?.tipo !== 'COMBUSTIVEL') return false;
                const nomeProduto = item.produto.nome.toUpperCase();
                const tipoVeiculo = veiculo.tipoCombustivel;

                if (tipoVeiculo === 'DIESEL_S10' && (nomeProduto.includes('GASOLINA') || nomeProduto.includes('ETANOL'))) return true;
                if ((['GASOLINA_COMUM', 'ETANOL', 'GNV'].includes(tipoVeiculo)) && nomeProduto.includes('DIESEL')) return true;
                return false;
            });

            if (combustivelErrado) {
                res.status(400).json({ error: `Bloqueio: Veículo ${veiculo.tipoCombustivel} incompatível com ${combustivelErrado.produto?.nome}.` });
                return;
            }

            // AUDITORIA KM
            const ultimoKM = await KmService.getUltimoKMRegistrado(dados.veiculoId);
            if (dados.kmOdometro < ultimoKM) {
                console.warn(`[Abastecimento] Retroativo: KM ${dados.kmOdometro} < ${ultimoKM}`);
            }

            // CÁLCULOS
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

            const novoAbastecimento = await prisma.$transaction(async (tx) => {
                return await tx.abastecimento.create({
                    data: {
                        veiculo: { connect: { id: dados.veiculoId } },
                        operador: { connect: { id: dados.operadorId } },
                        fornecedor: { connect: { id: dados.fornecedorId } },
                        kmOdometro: dados.kmOdometro,
                        dataHora: dados.dataHora,
                        custoTotal: custoTotalGeral,
                        placaCartaoUsado: dados.placaCartaoUsado ?? null,
                        observacoes: dados.observacoes ?? null,
                        justificativa: dados.justificativa ?? null,
                        fotoNotaFiscalUrl: dados.fotoNotaFiscalUrl ?? null,
                        itens: { create: itensParaCriar },
                    },
                    include: { itens: { include: { produto: true } } },
                });
            });

            res.status(201).json(novoAbastecimento);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca por ID.
     */
    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            // Validação de existência para satisfazer o TypeScript strict null checks
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }

            // Aqui o TS sabe que 'id' é string
            const abastecimento = await prisma.abastecimento.findUnique({
                where: { id },
                include: {
                    veiculo: { select: { id: true, placa: true, modelo: true } },
                    operador: { select: { id: true, nome: true } },
                    fornecedor: { select: { id: true, nome: true } },
                    itens: { include: { produto: { select: { id: true, nome: true, tipo: true } } } }
                }
            });

            if (!abastecimento) {
                res.status(404).json({ error: 'Abastecimento não encontrado.' });
                return;
            }

            res.json(abastecimento);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Atualização.
     */
    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;

            // CORREÇÃO SEGURA: Type Guard
            if (!id) {
                res.status(400).json({ error: 'ID é obrigatório.' });
                return;
            }

            const dados = req.body as AbastecimentoData;

            const existente = await prisma.abastecimento.findUnique({ where: { id } });
            if (!existente) {
                res.status(404).json({ error: 'Registro não encontrado.' });
                return;
            }

            const veiculo = await prisma.veiculo.findUnique({ where: { id: dados.veiculoId } });
            if (veiculo) {
                const itensComDetalhes = await Promise.all(dados.itens.map(async (item) => {
                    const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
                    return { ...item, produto };
                }));

                const combustivelErrado = itensComDetalhes.find(item => {
                    if (item.produto?.tipo !== 'COMBUSTIVEL') return false;
                    const nomeProduto = item.produto.nome.toUpperCase();
                    const tipoVeiculo = veiculo.tipoCombustivel;

                    if (tipoVeiculo === 'DIESEL_S10' && (nomeProduto.includes('GASOLINA') || nomeProduto.includes('ETANOL'))) return true;
                    if ((['GASOLINA_COMUM', 'ETANOL', 'GNV'].includes(tipoVeiculo)) && nomeProduto.includes('DIESEL')) return true;
                    return false;
                });

                if (combustivelErrado) {
                    res.status(400).json({ error: `Bloqueio: Veículo ${veiculo.tipoCombustivel} incompatível com ${combustivelErrado.produto?.nome}.` });
                    return;
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
                    valorTotal: Number(total.toFixed(2)),
                };
            });
            custoTotalGeral = Number(custoTotalGeral.toFixed(2));

            const atualizado = await prisma.$transaction(async (tx) => {
                // Aqui usamos 'id' que foi validado acima
                await tx.itemAbastecimento.deleteMany({
                    where: { abastecimentoId: id }
                });

                return await tx.abastecimento.update({
                    where: { id },
                    data: {
                        veiculoId: dados.veiculoId,
                        operadorId: dados.operadorId,
                        fornecedorId: dados.fornecedorId,
                        kmOdometro: dados.kmOdometro,
                        dataHora: dados.dataHora,
                        custoTotal: custoTotalGeral,
                        placaCartaoUsado: dados.placaCartaoUsado ?? null,
                        justificativa: dados.justificativa ?? null,
                        itens: { create: itensParaCriar }
                    },
                    include: { itens: { include: { produto: true } } }
                });
            });

            res.json(atualizado);

        } catch (error) {
            next(error);
        }
    }

    listRecent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { dataInicio, dataFim, veiculoId, limit } = req.query;
            const where: Prisma.AbastecimentoWhereInput = {};

            if (dataInicio || dataFim) {
                const dateFilter: Prisma.DateTimeFilter = {};
                if (dataInicio && typeof dataInicio === 'string') dateFilter.gte = new Date(dataInicio);
                if (dataFim && typeof dataFim === 'string') {
                    const fim = new Date(dataFim);
                    fim.setDate(fim.getDate() + 1);
                    dateFilter.lt = fim;
                }
                if (Object.keys(dateFilter).length > 0) where.dataHora = dateFilter;
            }
            if (veiculoId && typeof veiculoId === 'string') where.veiculoId = veiculoId;

            const findOptions: Prisma.AbastecimentoFindManyArgs = {
                where,
                orderBy: { dataHora: 'desc' },
                include: {
                    veiculo: { select: { id: true, placa: true, modelo: true } },
                    operador: { select: { nome: true } },
                    fornecedor: { select: { nome: true } },
                    itens: { include: { produto: { select: { nome: true, tipo: true } } } }
                }
            };
            if (limit !== 'all') findOptions.take = 50;

            const recentes = await prisma.abastecimento.findMany(findOptions);
            res.json(recentes);
        } catch (error) { next(error); }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Apenas Admins.' });
                return;
            }

            const { id } = req.params;

            // CORREÇÃO SEGURA: Validação obrigatória
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }

            await prisma.$transaction(async (tx) => {
                // Aqui 'id' é string segura
                const exists = await tx.abastecimento.findUnique({ where: { id } });
                if (!exists) throw new Error('Registro não encontrado');

                await tx.itemAbastecimento.deleteMany({ where: { abastecimentoId: id } });
                await tx.abastecimento.delete({ where: { id } });
            });
            res.json({ message: 'Removido.' });
        } catch (error) { next(error); }
    }
}