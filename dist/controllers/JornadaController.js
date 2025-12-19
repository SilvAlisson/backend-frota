"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
const JornadaService_1 = require("../services/JornadaService");
class JornadaController {
    // --- INICIAR JORNADA ---
    iniciar = async (req, res, next) => {
        try {
            const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body;
            const operadorId = req.user?.userId;
            if (!operadorId) {
                res.status(401).json({ error: 'Usuário não autenticado.' });
                return;
            }
            // CORREÇÃO: Validação explícita para o TypeScript e para a Regra de Negócio
            // Como seu Prisma exige Encarregado, barramos aqui se ele não vier no body.
            if (!encarregadoId) {
                res.status(400).json({ error: 'É obrigatório informar um encarregado para iniciar a jornada.' });
                return;
            }
            // 0. BLINDAGEM MOTORISTA FANTASMA
            const jornadaEmAberto = await prisma_1.prisma.jornada.findFirst({
                where: {
                    operadorId: operadorId,
                    dataFim: null
                },
                include: { veiculo: true }
            });
            if (jornadaEmAberto) {
                res.status(409).json({
                    error: `Você já possui uma jornada em andamento no veículo ${jornadaEmAberto.veiculo.placa}. Finalize-a antes de iniciar uma nova.`
                });
                return;
            }
            const veiculo = await prisma_1.prisma.veiculo.findUnique({ where: { id: veiculoId } });
            const usuario = await prisma_1.prisma.user.findUnique({ where: { id: operadorId } });
            if (!veiculo || !usuario) {
                res.status(404).json({ error: 'Veículo ou usuário não encontrados.' });
                return;
            }
            // 0.5. BLINDAGEM DE CNH (Compliance)
            const tipoVeiculo = veiculo.tipoVeiculo?.toUpperCase() || '';
            const cnhCategoria = usuario.cnhCategoria?.toUpperCase() || '';
            const exigeCategoriaPesada = ['CAMINHAO', 'TRUCK', 'CARRETA', 'MUNCK', 'ONIBUS'].some(t => tipoVeiculo.includes(t));
            const temCategoriaPesada = ['C', 'D', 'E'].some(c => cnhCategoria.includes(c));
            if (exigeCategoriaPesada && !temCategoriaPesada) {
                console.warn(`[Compliance] Motorista ${usuario.nome} (CNH ${cnhCategoria}) iniciou jornada em veículo pesado ${veiculo.modelo}.`);
            }
            // 1. VALIDAÇÃO DE KM
            const ultimoKMConsolidado = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            const jornadaAbertaAnterior = await prisma_1.prisma.jornada.findFirst({
                where: { veiculoId: veiculoId, kmFim: null },
                orderBy: { dataInicio: 'desc' }
            });
            const kmReferencia = jornadaAbertaAnterior
                ? Math.max(ultimoKMConsolidado, jornadaAbertaAnterior.kmInicio)
                : ultimoKMConsolidado;
            if (kmInicio < kmReferencia) {
                res.status(400).json({
                    error: `KM Inválido! O veículo já possui registro de ${kmReferencia} KM. Verifique o painel.`
                });
                return;
            }
            // 2. TRANSAÇÃO DE RENDIÇÃO AUTOMÁTICA
            const novaJornada = await prisma_1.prisma.$transaction(async (tx) => {
                // Passo A: Fechar jornada anterior (se houver)
                if (jornadaAbertaAnterior) {
                    await tx.jornada.update({
                        where: { id: jornadaAbertaAnterior.id },
                        data: {
                            kmFim: kmInicio,
                            dataFim: new Date(),
                            observacoes: (jornadaAbertaAnterior.observacoes || '') + ' [Rendição: Fechado pelo próximo operador]'
                        }
                    });
                }
                else {
                    const ultimaJornadaFechada = await tx.jornada.findFirst({
                        where: { veiculoId: veiculoId, kmFim: { not: null } },
                        orderBy: { dataFim: 'desc' }
                    });
                    if (ultimaJornadaFechada && ultimaJornadaFechada.observacoes?.includes('[SYSTEM_AUTO_CLOSE]')) {
                        await tx.jornada.update({
                            where: { id: ultimaJornadaFechada.id },
                            data: {
                                kmFim: kmInicio,
                                observacoes: ultimaJornadaFechada.observacoes + ' [Correção: KM validado pelo próximo operador]'
                            }
                        });
                    }
                }
                // Passo B: Criar a nova jornada (Campos obrigatórios garantidos)
                return await tx.jornada.create({
                    data: {
                        veiculoId,
                        operadorId,
                        encarregadoId, // Agora o TS confia que é string devido ao 'if' acima
                        dataInicio: new Date(),
                        kmInicio,
                        observacoes: observacoes ?? null,
                        fotoInicioUrl: fotoInicioUrl ?? null,
                    },
                    include: { veiculo: true, encarregado: true }
                });
            });
            res.status(201).json(novaJornada);
        }
        catch (error) {
            next(error);
        }
    };
    // --- FINALIZAR JORNADA ---
    finalizar = async (req, res, next) => {
        try {
            const { kmFim, observacoes, fotoFimUrl } = req.body;
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID da jornada não fornecido.' });
                return;
            }
            const jornada = await prisma_1.prisma.jornada.findUnique({ where: { id } });
            if (!jornada) {
                res.status(404).json({ error: 'Jornada não encontrada.' });
                return;
            }
            const isDono = jornada.operadorId === req.user?.userId;
            const isGestor = ['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '');
            if (!isDono && !isGestor) {
                res.status(403).json({ error: 'Sem permissão para fechar esta jornada.' });
                return;
            }
            if (jornada.dataFim) {
                res.status(400).json({ error: 'Jornada já finalizada.' });
                return;
            }
            if (kmFim < jornada.kmInicio) {
                res.status(400).json({ error: `KM Final (${kmFim}) não pode ser menor que o Inicial (${jornada.kmInicio}).` });
                return;
            }
            const ultimoKMGlobal = await KmService_1.KmService.getUltimoKMRegistrado(jornada.veiculoId);
            if (kmFim < ultimoKMGlobal && ultimoKMGlobal > jornada.kmInicio) {
                res.status(400).json({
                    error: `Inconsistência: Existe um registro com KM ${ultimoKMGlobal} posterior ao início desta jornada.`
                });
                return;
            }
            const finalizada = await prisma_1.prisma.jornada.update({
                where: { id },
                data: {
                    dataFim: new Date(),
                    kmFim: kmFim,
                    observacoes: observacoes ?? null,
                    fotoFimUrl: fotoFimUrl ?? null,
                },
            });
            res.json(finalizada);
        }
        catch (error) {
            next(error);
        }
    };
    // --- LISTAGENS ---
    listarAbertas = async (req, res, next) => {
        try {
            const list = await prisma_1.prisma.jornada.findMany({
                where: { kmFim: null },
                include: { veiculo: true, operador: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(list);
        }
        catch (error) {
            next(error);
        }
    };
    listarMinhasAbertas = async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const list = await prisma_1.prisma.jornada.findMany({
                where: { operadorId: userId, kmFim: null },
                include: { veiculo: true, encarregado: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(list);
        }
        catch (error) {
            next(error);
        }
    };
    listarHistorico = async (req, res, next) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { dataInicio, dataFim, veiculoId, operadorId } = req.query;
            const where = { kmFim: { not: null } };
            if (dataInicio)
                where.dataInicio = { gte: new Date(dataInicio) };
            if (dataFim) {
                const fim = new Date(dataFim);
                fim.setDate(fim.getDate() + 1);
                where.dataInicio = { ...where.dataInicio, lt: fim };
            }
            if (veiculoId)
                where.veiculoId = veiculoId;
            if (operadorId)
                where.operadorId = operadorId;
            const historico = await prisma_1.prisma.jornada.findMany({
                where,
                include: {
                    veiculo: { select: { placa: true, modelo: true } },
                    operador: { select: { nome: true } },
                    encarregado: { select: { nome: true } }
                },
                orderBy: { dataInicio: 'desc' },
                take: 100
            });
            const formatado = historico.map(j => ({
                ...j,
                kmPercorrido: (j.kmFim || 0) - j.kmInicio
            }));
            res.json(formatado);
        }
        catch (error) {
            next(error);
        }
    };
    verificarTimeouts = async (req, res, next) => {
        try {
            await JornadaService_1.JornadaService.fecharJornadasVencidas();
            res.json({ message: 'Verificação executada.', timestamp: new Date() });
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }
            await prisma_1.prisma.jornada.delete({ where: { id } });
            res.json({ message: 'Jornada removida com sucesso.' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.JornadaController = JornadaController;
//# sourceMappingURL=JornadaController.js.map