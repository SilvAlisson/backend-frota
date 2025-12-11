"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManutencaoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
class ManutencaoController {
    static async create(req, res) {
        // Apenas Gestores
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const encarregadoId = req.user?.userId;
        if (!encarregadoId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }
        try {
            // Zod já validou tipos, datas e campos obrigatórios básicos
            const dados = req.body;
            // =========================================================
            // CORREÇÃO: LÓGICA DE KM AGORA É OPCIONAL
            // =========================================================
            if (dados.veiculoId) {
                // Removemos o bloqueio de "KM obrigatório".
                // Agora verificamos a consistência APENAS se o KM for informado.
                if (dados.kmAtual !== null && dados.kmAtual !== undefined) {
                    const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(dados.veiculoId);
                    // Validação de consistência (não pode reduzir a quilometragem)
                    if (dados.kmAtual < ultimoKM) {
                        return res.status(400).json({
                            error: `KM informado (${dados.kmAtual}) é menor que o histórico (${ultimoKM}).`
                        });
                    }
                }
            }
            // Cálculo do Custo Total
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
            // Criação da OS
            const novaOS = await prisma_1.prisma.ordemServico.create({
                data: {
                    // Conecta ao veículo APENAS se veiculoId foi fornecido (e não é null/vazio)
                    ...(dados.veiculoId ? { veiculo: { connect: { id: dados.veiculoId } } } : {}),
                    fornecedor: { connect: { id: dados.fornecedorId } },
                    encarregado: { connect: { id: encarregadoId } },
                    // Nullish Coalescing (?? null) para satisfazer o Prisma
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
        }
        catch (error) {
            console.error("Erro criar OS:", error);
            res.status(500).json({ error: 'Erro ao registrar manutenção' });
        }
    }
    static async listRecent(req, res) {
        try {
            const { dataInicio, dataFim, veiculoId } = req.query;
            const where = {};
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
            const recentes = await prisma_1.prisma.ordemServico.findMany({
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
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }
    static async delete(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Apenas ADMIN pode deletar.' });
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID da OS não fornecido.' });
        try {
            await prisma_1.prisma.itemOrdemServico.deleteMany({ where: { ordemServicoId: id } });
            await prisma_1.prisma.ordemServico.delete({ where: { id } });
            res.json({ message: 'Manutenção removida.' });
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao remover registo.' });
        }
    }
}
exports.ManutencaoController = ManutencaoController;
//# sourceMappingURL=ManutencaoController.js.map