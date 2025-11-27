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
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            if (kmAtualFloat < ultimoKM) {
                return res.status(400).json({ error: `KM (${kmAtualFloat}) menor que o histórico (${ultimoKM}).` });
            }
            let custoTotalGeral = 0;
            const itensParaCriar = itens.map((item) => {
                const total = parseFloat(item.quantidade) * parseFloat(item.valorPorUnidade);
                custoTotalGeral += total;
                return {
                    produtoId: item.produtoId,
                    quantidade: parseFloat(item.quantidade),
                    valorPorUnidade: parseFloat(item.valorPorUnidade),
                    valorTotal: total,
                };
            });
            const novaOS = await prisma_1.prisma.ordemServico.create({
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