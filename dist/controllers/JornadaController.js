"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
const JornadaService_1 = require("../services/JornadaService");
class JornadaController {
    // --- INICIAR JORNADA (Com Lógica de Rendição) ---
    static async iniciar(req, res) {
        try {
            const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body;
            const operadorId = req.user?.userId;
            if (!operadorId)
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            // =================================================================================
            // PASSO 1: VALIDAÇÃO DE KM
            // =================================================================================
            const ultimoKMConsolidado = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            const jornadaAbertaAnterior = await prisma_1.prisma.jornada.findFirst({
                where: { veiculoId: veiculoId, kmFim: null },
                orderBy: { dataInicio: 'desc' }
            });
            const kmReferencia = jornadaAbertaAnterior
                ? Math.max(ultimoKMConsolidado, jornadaAbertaAnterior.kmInicio)
                : ultimoKMConsolidado;
            if (kmInicio < kmReferencia) {
                return res.status(400).json({
                    error: `KM Inválido! O veículo já possui registro de ${kmReferencia} KM. Verifique o painel.`
                });
            }
            const transacoes = [];
            // =================================================================================
            // PASSO 2: RESOLUÇÃO DE PENDÊNCIAS
            // =================================================================================
            if (jornadaAbertaAnterior) {
                transacoes.push(prisma_1.prisma.jornada.update({
                    where: { id: jornadaAbertaAnterior.id },
                    data: {
                        kmFim: kmInicio,
                        dataFim: new Date(),
                        observacoes: (jornadaAbertaAnterior.observacoes || '') + ' [Rendição: Fechado pelo próximo operador]'
                    }
                }));
            }
            else {
                const ultimaJornadaFechada = await prisma_1.prisma.jornada.findFirst({
                    where: { veiculoId: veiculoId, kmFim: { not: null } },
                    orderBy: { dataFim: 'desc' }
                });
                if (ultimaJornadaFechada && ultimaJornadaFechada.observacoes?.includes('[SYSTEM_AUTO_CLOSE]')) {
                    transacoes.push(prisma_1.prisma.jornada.update({
                        where: { id: ultimaJornadaFechada.id },
                        data: {
                            kmFim: kmInicio,
                            observacoes: ultimaJornadaFechada.observacoes + ' [Correção: KM validado pelo próximo operador]'
                        }
                    }));
                }
            }
            // =================================================================================
            // PASSO 3: CRIAR NOVA JORNADA
            // =================================================================================
            transacoes.push(prisma_1.prisma.jornada.create({
                data: {
                    veiculo: { connect: { id: veiculoId } },
                    operador: { connect: { id: operadorId } },
                    encarregado: { connect: { id: encarregadoId } },
                    dataInicio: new Date(),
                    kmInicio: kmInicio,
                    // CORREÇÃO: Forçar null se for undefined
                    observacoes: observacoes ?? null,
                    fotoInicioUrl: fotoInicioUrl ?? null,
                },
                include: { veiculo: true, encarregado: true }
            }));
            const resultados = await prisma_1.prisma.$transaction(transacoes);
            const novaJornada = resultados[resultados.length - 1];
            res.status(201).json(novaJornada);
        }
        catch (error) {
            console.error("Erro ao iniciar jornada:", error);
            res.status(500).json({ error: 'Erro interno ao processar início de jornada.' });
        }
    }
    // --- FINALIZAR JORNADA ---
    static async finalizar(req, res) {
        try {
            const { kmFim, observacoes, fotoFimUrl } = req.body;
            const { id: jornadaId } = req.params;
            const jornada = await prisma_1.prisma.jornada.findUnique({ where: { id: jornadaId } });
            if (!jornada)
                return res.status(404).json({ error: 'Jornada não encontrada.' });
            const isDono = jornada.operadorId === req.user?.userId;
            const isGestor = ['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '');
            if (!isDono && !isGestor) {
                return res.status(403).json({ error: 'Sem permissão para fechar esta jornada.' });
            }
            if (kmFim < jornada.kmInicio) {
                return res.status(400).json({ error: `KM Final (${kmFim}) não pode ser menor que o Inicial (${jornada.kmInicio}).` });
            }
            const ultimoKMGlobal = await KmService_1.KmService.getUltimoKMRegistrado(jornada.veiculoId);
            if (kmFim < ultimoKMGlobal && ultimoKMGlobal > jornada.kmInicio) {
                return res.status(400).json({
                    error: `Inconsistência: Existe um registro (Abastecimento/Manutenção) com KM ${ultimoKMGlobal} posterior ao início desta jornada.`
                });
            }
            const finalizada = await prisma_1.prisma.jornada.update({
                where: { id: jornadaId },
                data: {
                    dataFim: new Date(),
                    kmFim: kmFim,
                    // CORREÇÃO: Forçar null se for undefined
                    observacoes: observacoes ?? null,
                    fotoFimUrl: fotoFimUrl ?? null,
                },
            });
            res.json(finalizada);
        }
        catch (error) {
            console.error("Erro ao finalizar:", error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    }
    // --- LISTAR ABERTAS ---
    static async listarAbertas(req, res) {
        const permitido = ['ADMIN', 'ENCARREGADO', 'OPERADOR', 'COORDENADOR'].includes(req.user?.role || '');
        if (!permitido)
            return res.sendStatus(403);
        try {
            const list = await prisma_1.prisma.jornada.findMany({
                where: { kmFim: null },
                include: { veiculo: true, operador: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(list);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao listar.' });
        }
    }
    static async listarMinhasAbertas(req, res) {
        const userId = req.user?.userId;
        if (!userId)
            return res.sendStatus(401);
        try {
            const list = await prisma_1.prisma.jornada.findMany({
                where: { operadorId: userId, kmFim: null },
                include: { veiculo: true, encarregado: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(list);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao listar.' });
        }
    }
    // --- HISTÓRICO ---
    static async listarHistorico(req, res) {
        if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || ''))
            return res.sendStatus(403);
        try {
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
        catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    }
    static async verificarTimeouts(req, res) {
        try {
            await JornadaService_1.JornadaService.fecharJornadasVencidas();
            res.json({ message: 'Verificação executada.', timestamp: new Date() });
        }
        catch (e) {
            res.status(500).json({ error: 'Erro no cron.' });
        }
    }
    static async delete(req, res) {
        if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido.' });
        try {
            await prisma_1.prisma.jornada.delete({ where: { id } });
            res.json({ message: 'Jornada removida com sucesso.' });
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao deletar jornada.' });
        }
    }
}
exports.JornadaController = JornadaController;
//# sourceMappingURL=JornadaController.js.map