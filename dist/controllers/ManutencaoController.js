"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManutencaoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
class ManutencaoController {
    static async create(req, res) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const encarregadoId = req.user?.userId;
        if (!encarregadoId)
            return res.status(401).json({ error: 'Auth error' });
        try {
            const dados = req.body;
            // =================================================================================
            // 1. INTELIGÊNCIA: ALERTA DE GARANTIA (90 Dias)
            // =================================================================================
            // Verifica se algum item já foi trocado recentemente neste veículo
            if (dados.veiculoId) {
                const diasGarantia = 90;
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - diasGarantia);
                // Usamos loop for..of para permitir await sequencial (ou Promise.all)
                for (const item of dados.itens) {
                    const ultimaTroca = await prisma_1.prisma.itemOrdemServico.findFirst({
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
                        // Loga o alerta no servidor (futuramente pode retornar um aviso ao frontend)
                        console.warn(`[Manutenção] ALERTA DE GARANTIA: Item "${ultimaTroca.produto.nome}" foi trocado em ${ultimaTroca.ordemServico.data.toLocaleDateString()}. Veículo: ${dados.veiculoId}`);
                    }
                }
            }
            // =================================================================================
            // 2. VALIDAÇÃO DE KM (AUDITORIA)
            // =================================================================================
            if (dados.veiculoId && dados.kmAtual) {
                const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(dados.veiculoId);
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
                    // CORREÇÃO: Arredondamento para evitar dízimas no banco
                    valorTotal: Number(total.toFixed(2)),
                };
            });
            // Arredonda o total geral da OS
            custoTotalGeral = Number(custoTotalGeral.toFixed(2));
            // 4. Transação (Criação)
            const novaOS = await prisma_1.prisma.$transaction(async (tx) => {
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
        }
        catch (error) {
            console.error("Erro criar OS:", error);
            res.status(500).json({ error: 'Erro ao registrar manutenção' });
        }
    }
    static async update(req, res) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido.' });
        const dados = req.body;
        try {
            const osAtualizada = await prisma_1.prisma.$transaction(async (tx) => {
                const exists = await tx.ordemServico.findUnique({ where: { id } });
                if (!exists)
                    throw new Error("RECORD_NOT_FOUND");
                let custoTotalGeral = 0;
                const itensParaCriar = dados.itens.map((item) => {
                    const total = item.quantidade * item.valorPorUnidade;
                    custoTotalGeral += total;
                    return {
                        produtoId: item.produtoId,
                        quantidade: item.quantidade,
                        valorPorUnidade: item.valorPorUnidade,
                        // CORREÇÃO: Arredondamento
                        valorTotal: Number(total.toFixed(2)),
                    };
                });
                // Arredonda o total geral da OS
                custoTotalGeral = Number(custoTotalGeral.toFixed(2));
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
        }
        catch (error) {
            if (error.message === "RECORD_NOT_FOUND")
                return res.status(404).json({ error: "OS não encontrada." });
            console.error("Erro update OS:", error);
            res.status(500).json({ error: 'Erro ao atualizar.' });
        }
    }
    static async listRecent(req, res) {
        try {
            const { dataInicio, dataFim, veiculoId, limit } = req.query;
            const where = {};
            if (dataInicio || dataFim) {
                const dateFilter = {};
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
            const options = {
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
            const recentes = await prisma_1.prisma.ordemServico.findMany(options);
            res.json(recentes);
        }
        catch (error) {
            console.error("Erro listRecent:", error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }
    static async delete(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Apenas ADMIN.' });
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido.' });
        try {
            await prisma_1.prisma.$transaction(async (tx) => {
                const exists = await tx.ordemServico.findUnique({ where: { id } });
                if (!exists)
                    throw new Error("RECORD_NOT_FOUND");
                await tx.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });
                await tx.ordemServico.delete({ where: { id } });
            });
            res.json({ message: 'Removido.' });
        }
        catch (error) {
            if (error.message === "RECORD_NOT_FOUND")
                return res.status(404).json({ error: "OS não encontrada." });
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}
exports.ManutencaoController = ManutencaoController;
//# sourceMappingURL=ManutencaoController.js.map