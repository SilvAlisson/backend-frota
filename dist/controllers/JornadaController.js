"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
const JornadaService_1 = require("../services/JornadaService");
class JornadaController {
    // --- INICIAR JORNADA (Com Blindagem e Lógica de Rendição) ---
    static async iniciar(req, res) {
        try {
            const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body;
            const operadorId = req.user?.userId;
            if (!operadorId)
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            // =================================================================================
            // PASSO 0: BLINDAGEM MOTORISTA FANTASMA (Jornada Dupla)
            // =================================================================================
            // Impede que um operador inicie uma nova jornada se já tiver outra aberta em qualquer veículo
            const jornadaEmAberto = await prisma_1.prisma.jornada.findFirst({
                where: {
                    operadorId: operadorId,
                    dataFim: null
                },
                include: { veiculo: true }
            });
            if (jornadaEmAberto) {
                return res.status(409).json({
                    error: `Você já possui uma jornada em andamento no veículo ${jornadaEmAberto.veiculo.placa}. Finalize-a antes de iniciar uma nova.`
                });
            }
            // Busca dados para validações de CNH
            const veiculo = await prisma_1.prisma.veiculo.findUnique({ where: { id: veiculoId } });
            const usuario = await prisma_1.prisma.user.findUnique({ where: { id: operadorId } });
            if (!veiculo || !usuario)
                return res.status(404).json({ error: 'Veículo ou usuário não encontrados.' });
            // =================================================================================
            // PASSO 0.5: BLINDAGEM DE CNH (Compliance)
            // =================================================================================
            const tipoVeiculo = veiculo.tipoVeiculo?.toUpperCase() || '';
            const cnhCategoria = usuario.cnhCategoria?.toUpperCase() || '';
            // Define quais veículos são "pesados"
            const exigeCategoriaPesada = ['CAMINHAO', 'TRUCK', 'CARRETA', 'MUNCK', 'ONIBUS'].some(t => tipoVeiculo.includes(t));
            // Define quais categorias permitem dirigir pesados
            const temCategoriaPesada = ['C', 'D', 'E'].some(c => cnhCategoria.includes(c));
            if (exigeCategoriaPesada && !temCategoriaPesada) {
                // Apenas loga o aviso para não travar a operação caso o cadastro esteja desatualizado
                console.warn(`[Compliance] Motorista ${usuario.nome} (CNH ${cnhCategoria}) iniciou jornada em veículo pesado ${veiculo.modelo} (${tipoVeiculo}).`);
            }
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
            // PASSO 2: RESOLUÇÃO DE PENDÊNCIAS (Rendição Automática)
            // =================================================================================
            if (jornadaAbertaAnterior) {
                // Se o veículo estava com jornada aberta por OUTRO motorista, fecha a dele automaticamente
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
                // Se a última jornada foi fechada pelo sistema (timeout), tenta corrigir o KM final com o atual
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
                    // Se foi aberto por um Encarregado, ele pode estar abrindo para si mesmo ou apenas supervisionando
                    // Aqui mantemos a lógica original: se encarregadoId vier no body, usa ele.
                    ...(encarregadoId ? { encarregado: { connect: { id: encarregadoId } } } : {}),
                    dataInicio: new Date(),
                    kmInicio: kmInicio,
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
            if (jornada.dataFim)
                return res.status(400).json({ error: 'Jornada já finalizada.' });
            if (kmFim < jornada.kmInicio) {
                return res.status(400).json({ error: `KM Final (${kmFim}) não pode ser menor que o Inicial (${jornada.kmInicio}).` });
            }
            const ultimoKMGlobal = await KmService_1.KmService.getUltimoKMRegistrado(jornada.veiculoId);
            // Verifica se houve lançamentos posteriores que invalidam este KM final
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