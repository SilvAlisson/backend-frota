"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbastecimentoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
const client_1 = require("@prisma/client");
class AbastecimentoController {
    /**
     * Registra um novo abastecimento.
     * Inclui validação de tipo de combustível (Blindagem) e auditoria de KM.
     */
    create = async (req, res, next) => {
        try {
            // 1. Verificação de Permissão
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado. Apenas Gestores podem lançar abastecimentos.' });
                return;
            }
            const dados = req.body;
            // 2. Busca veículo para validações
            const veiculo = await prisma_1.prisma.veiculo.findUnique({ where: { id: dados.veiculoId } });
            if (!veiculo) {
                res.status(404).json({ error: "Veículo não encontrado." });
                return;
            }
            // =================================================================================
            // 3. BLINDAGEM INTELIGENTE: TIPO DE COMBUSTÍVEL
            // =================================================================================
            // Busca detalhes dos produtos para saber se é Gasolina, Diesel, etc.
            const itensComDetalhes = await Promise.all(dados.itens.map(async (item) => {
                const produto = await prisma_1.prisma.produto.findUnique({ where: { id: item.produtoId } });
                return { ...item, produto };
            }));
            // Verifica incompatibilidade
            const combustivelErrado = itensComDetalhes.find(item => {
                if (item.produto?.tipo !== 'COMBUSTIVEL')
                    return false; // Arla/Aditivo passa direto
                const nomeProduto = item.produto.nome.toUpperCase();
                const tipoVeiculo = veiculo.tipoCombustivel;
                // Regra A: Veículo Diesel tentando abastecer Gasolina/Etanol
                if (tipoVeiculo === 'DIESEL_S10' && (nomeProduto.includes('GASOLINA') || nomeProduto.includes('ETANOL')))
                    return true;
                // Regra B: Veículo Flex tentando abastecer Diesel
                if ((['GASOLINA_COMUM', 'ETANOL', 'GNV'].includes(tipoVeiculo)) && nomeProduto.includes('DIESEL'))
                    return true;
                return false;
            });
            if (combustivelErrado) {
                res.status(400).json({
                    error: `Bloqueio de Segurança: Veículo ${veiculo.tipoCombustivel} não pode abastecer ${combustivelErrado.produto?.nome}.`
                });
                return;
            }
            // =================================================================================
            // 4. AUDITORIA DE KM
            // =================================================================================
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(dados.veiculoId);
            if (dados.kmOdometro < ultimoKM) {
                console.warn(`[Abastecimento] Retroativo: KM informado ${dados.kmOdometro} < Atual ${ultimoKM}. Veículo: ${dados.veiculoId}`);
            }
            // =================================================================================
            // 5. CÁLCULOS E TRANSAÇÃO
            // =================================================================================
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
            // Arredonda o total geral
            custoTotalGeral = Number(custoTotalGeral.toFixed(2));
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
            next(error);
        }
    };
    /**
     * Lista abastecimentos recentes com filtros.
     */
    listRecent = async (req, res, next) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
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
            // CORREÇÃO ELEGANTE: 
            // Criamos o objeto de opções tipado explicitamente.
            // Isso evita erros de 'take: number | undefined' que o Prisma rejeita.
            const findOptions = {
                where,
                orderBy: { dataHora: 'desc' },
                include: {
                    veiculo: { select: { id: true, placa: true, modelo: true } },
                    operador: { select: { nome: true } },
                    fornecedor: { select: { nome: true } },
                    itens: { include: { produto: { select: { nome: true, tipo: true } } } }
                }
            };
            // Adicionamos 'take' apenas se necessário.
            if (limit !== 'all') {
                findOptions.take = 50;
            }
            const recentes = await prisma_1.prisma.abastecimento.findMany(findOptions);
            res.json(recentes);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Remove um abastecimento e seus itens (Transação).
     */
    delete = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Apenas Administradores podem excluir abastecimentos.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }
            await prisma_1.prisma.$transaction(async (tx) => {
                const exists = await tx.abastecimento.findUnique({ where: { id } });
                if (!exists) {
                    // Lança erro P2025 (padrão Prisma para Record Not Found) para o middleware tratar
                    throw new client_1.Prisma.PrismaClientKnownRequestError('Record not found', {
                        code: 'P2025',
                        clientVersion: '5'
                    });
                }
                await tx.itemAbastecimento.deleteMany({ where: { abastecimentoId: id } });
                await tx.abastecimento.delete({ where: { id } });
            });
            res.json({ message: 'Abastecimento removido.' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AbastecimentoController = AbastecimentoController;
//# sourceMappingURL=AbastecimentoController.js.map