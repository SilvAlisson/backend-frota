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
            const dados = req.body;
            // Busca veículo para validações inteligentes (Blindagem de Combustível e KM)
            const veiculo = await prisma_1.prisma.veiculo.findUnique({ where: { id: dados.veiculoId } });
            if (!veiculo)
                return res.status(404).json({ error: "Veículo não encontrado." });
            // =================================================================================
            // 1. BLINDAGEM INTELIGENTE: TIPO DE COMBUSTÍVEL
            // =================================================================================
            // Evita que um veículo DIESEL abasteça GASOLINA/ETANOL e vice-versa.
            // Busca detalhes dos produtos selecionados para verificar o tipo
            const itensComDetalhes = await Promise.all(dados.itens.map(async (item) => {
                const produto = await prisma_1.prisma.produto.findUnique({ where: { id: item.produtoId } });
                return { ...item, produto };
            }));
            // Verifica se há incompatibilidade
            const combustivelErrado = itensComDetalhes.find(item => {
                // Se não for combustível (ex: Arla, Aditivo), não precisa bloquear
                if (item.produto?.tipo !== 'COMBUSTIVEL')
                    return false;
                const nomeProduto = item.produto.nome.toUpperCase();
                const tipoVeiculo = veiculo.tipoCombustivel; // DIESEL_S10, GASOLINA_COMUM, etc.
                // Regra 1: Veículo Diesel tentando abastecer Gasolina ou Etanol
                if (tipoVeiculo === 'DIESEL_S10' && (nomeProduto.includes('GASOLINA') || nomeProduto.includes('ETANOL')))
                    return true;
                // Regra 2: Veículo Gasolina/Flex tentando abastecer Diesel
                if ((tipoVeiculo === 'GASOLINA_COMUM' || tipoVeiculo === 'ETANOL' || tipoVeiculo === 'GNV') && nomeProduto.includes('DIESEL'))
                    return true;
                return false;
            });
            if (combustivelErrado) {
                return res.status(400).json({
                    error: `Bloqueio de Segurança: Veículo ${veiculo.tipoCombustivel} não pode abastecer ${combustivelErrado.produto?.nome}.`
                });
            }
            // =================================================================================
            // 2. VALIDAÇÃO DE KM (AUDITORIA)
            // =================================================================================
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(dados.veiculoId);
            // Apenas alerta, não bloqueia (permite lançamento retroativo em caso de esquecimento)
            if (dados.kmOdometro < ultimoKM) {
                console.warn(`[Abastecimento] Retroativo: KM informado ${dados.kmOdometro} < Atual ${ultimoKM}. Veículo: ${dados.veiculoId}`);
            }
            // 3. Preparação dos Itens e Cálculo (SAFE DECIMAL)
            let custoTotalGeral = 0;
            const itensParaCriar = dados.itens.map((item) => {
                const total = item.quantidade * item.valorPorUnidade;
                custoTotalGeral += total;
                return {
                    produtoId: item.produtoId,
                    quantidade: item.quantidade,
                    valorPorUnidade: item.valorPorUnidade,
                    // CORREÇÃO: Arredondamento para evitar dízimas no banco Decimal(10,2)
                    valorTotal: Number(total.toFixed(2)),
                };
            });
            // Arredonda o total geral da nota para evitar erros de precisão
            custoTotalGeral = Number(custoTotalGeral.toFixed(2));
            // 4. Transação ACID
            // Garante que o registro seja atômico
            const novoAbastecimento = await prisma_1.prisma.$transaction(async (tx) => {
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
                    where.dataHora = dateFilter;
                }
            }
            if (veiculoId && typeof veiculoId === 'string') {
                where.veiculoId = veiculoId;
            }
            const recentes = await prisma_1.prisma.abastecimento.findMany({
                where,
                // Spread condicional para evitar erro de tipo com 'undefined'
                ...(limit !== 'all' ? { take: 50 } : {}),
                orderBy: { dataHora: 'desc' },
                include: {
                    // Importante: 'id: true' para que o frontend consiga vincular os dados corretamente nos relatórios
                    veiculo: { select: { id: true, placa: true, modelo: true } },
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
            await prisma_1.prisma.$transaction(async (tx) => {
                const exists = await tx.abastecimento.findUnique({ where: { id } });
                if (!exists)
                    throw new Error("RECORD_NOT_FOUND");
                await tx.itemAbastecimento.deleteMany({ where: { abastecimentoId: id } });
                await tx.abastecimento.delete({ where: { id } });
            });
            res.json({ message: 'Abastecimento removido.' });
        }
        catch (error) {
            if (error.message === 'RECORD_NOT_FOUND')
                return res.status(404).json({ error: 'Registro não encontrado.' });
            res.status(500).json({ error: 'Erro ao deletar registro.' });
        }
    }
}
exports.AbastecimentoController = AbastecimentoController;
//# sourceMappingURL=AbastecimentoController.js.map