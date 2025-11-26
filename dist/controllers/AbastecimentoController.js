"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbastecimentoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
class AbastecimentoController {
    static async create(req, res) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const { veiculoId, operadorId, fornecedorId, kmOdometro, dataHora, placaCartaoUsado, itens, observacoes, justificativa, fotoNotaFiscalUrl } = req.body;
            // Validação de campos obrigatórios
            if (!veiculoId || !operadorId || !fornecedorId || !kmOdometro || !dataHora || !itens || !fotoNotaFiscalUrl) {
                return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
            }
            const kmOdometroFloat = parseFloat(kmOdometro);
            // Validação Centralizada de KM
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            if (kmOdometroFloat < ultimoKM) {
                return res.status(400).json({
                    error: `KM informado (${kmOdometroFloat}) é menor que o histórico (${ultimoKM}).`
                });
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
            const novoAbastecimento = await prisma_1.prisma.abastecimento.create({
                data: {
                    veiculo: { connect: { id: veiculoId } },
                    operador: { connect: { id: operadorId } },
                    fornecedor: { connect: { id: fornecedorId } },
                    kmOdometro: kmOdometroFloat,
                    dataHora: new Date(dataHora),
                    custoTotal: custoTotalGeral,
                    placaCartaoUsado,
                    observacoes: observacoes || null,
                    justificativa: justificativa || null,
                    fotoNotaFiscalUrl,
                    itens: { create: itensParaCriar },
                },
                include: { itens: { include: { produto: true } } },
            });
            res.status(201).json(novoAbastecimento);
        }
        catch (error) {
            console.error("Erro no abastecimento:", error);
            res.status(500).json({ error: 'Erro ao registrar abastecimento' });
        }
    }
    static async listRecent(req, res) {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const { dataInicio, dataFim, veiculoId } = req.query;
            const where = {};
            // Construção segura do filtro de data
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
                // Só atribui se houver filtros definidos
                if (Object.keys(dateFilter).length > 0) {
                    where.dataHora = dateFilter;
                }
            }
            if (veiculoId && typeof veiculoId === 'string') {
                where.veiculoId = veiculoId;
            }
            const recentes = await prisma_1.prisma.abastecimento.findMany({
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
        }
        catch (error) {
            console.error("Erro ao buscar histórico:", error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }
    static async delete(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado.' });
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido.' });
        try {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.itemAbastecimento.deleteMany({ where: { abastecimentoId: id } }),
                prisma_1.prisma.abastecimento.delete({ where: { id } })
            ]);
            res.json({ message: 'Abastecimento removido.' });
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao deletar registo.' });
        }
    }
}
exports.AbastecimentoController = AbastecimentoController;
//# sourceMappingURL=AbastecimentoController.js.map