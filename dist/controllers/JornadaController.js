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
            const kmInicioFloat = parseFloat(kmInicio);
            // Validações Básicas
            if (!operadorId)
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            if (!veiculoId || !encarregadoId || isNaN(kmInicioFloat)) {
                return res.status(400).json({ error: 'Dados inválidos.' });
            }
            // =================================================================================
            // PASSO 1: VALIDAÇÃO DE KM (Impede erro do Cenario B - KM Menor)
            // =================================================================================
            // Busca o maior KM consolidado no banco (Abastecimentos, OS, Jornadas Finalizadas)
            const ultimoKMConsolidado = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            // Busca se existe uma jornada ABERTA para este veículo (Cenario B)
            const jornadaAbertaAnterior = await prisma_1.prisma.jornada.findFirst({
                where: { veiculoId: veiculoId, kmFim: null },
                orderBy: { dataInicio: 'desc' }
            });
            // O KM de referência é o maior entre o histórico e o início da jornada aberta
            // Se o Junior abriu com 10.000, o Carlos não pode abrir com 9.990.
            const kmReferencia = jornadaAbertaAnterior
                ? Math.max(ultimoKMConsolidado, jornadaAbertaAnterior.kmInicio)
                : ultimoKMConsolidado;
            if (kmInicioFloat < kmReferencia) {
                return res.status(400).json({
                    error: `KM Inválido! O veículo já possui registro de ${kmReferencia} KM. Verifique o painel.`
                });
            }
            const transacoes = [];
            // =================================================================================
            // PASSO 2: RESOLUÇÃO DE PENDÊNCIAS (Cenários B e C)
            // =================================================================================
            if (jornadaAbertaAnterior) {
                // --- CENÁRIO B: Troca de Turno (Jornada Aberta) ---
                // O Junior esqueceu aberta. O Carlos assume e fecha a do Junior com o KM atual.
                console.log(`[Rendição] Fechando jornada anterior aberta (ID: ${jornadaAbertaAnterior.id})`);
                transacoes.push(prisma_1.prisma.jornada.update({
                    where: { id: jornadaAbertaAnterior.id },
                    data: {
                        kmFim: kmInicioFloat, // Fecha com o KM de início do Carlos
                        dataFim: new Date(), // Fecha agora
                        observacoes: (jornadaAbertaAnterior.observacoes || '') + ' [Rendição: Fechado pelo próximo operador]'
                    }
                }));
            }
            else {
                // --- CENÁRIO C: Correção Pós-Cron (Jornada Fechada pelo Sistema) ---
                // Junior esqueceu, passou 17h, o sistema fechou zerado. Agora Carlos corrige.
                // Busca a última jornada fechada desse veículo
                const ultimaJornadaFechada = await prisma_1.prisma.jornada.findFirst({
                    where: { veiculoId: veiculoId, kmFim: { not: null } },
                    orderBy: { dataFim: 'desc' }
                });
                // Verifica se foi o robô que fechou (pela tag SYSTEM_AUTO_CLOSE)
                if (ultimaJornadaFechada && ultimaJornadaFechada.observacoes?.includes('[SYSTEM_AUTO_CLOSE]')) {
                    console.log(`[Correção] Atualizando jornada fechada pelo sistema (ID: ${ultimaJornadaFechada.id})`);
                    // A jornada estava "zerada" (kmFim = kmInicio). 
                    // Agora atualizamos o kmFim para o kmInicio do Carlos, contabilizando a rodagem do Junior.
                    transacoes.push(prisma_1.prisma.jornada.update({
                        where: { id: ultimaJornadaFechada.id },
                        data: {
                            kmFim: kmInicioFloat,
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
                    kmInicio: kmInicioFloat,
                    observacoes,
                    fotoInicioUrl,
                },
                include: { veiculo: true, encarregado: true }
            }));
            // Executa tudo atomicamente
            const resultados = await prisma_1.prisma.$transaction(transacoes);
            // Retorna o último resultado (a nova jornada criada)
            const novaJornada = resultados[resultados.length - 1];
            res.status(201).json(novaJornada);
        }
        catch (error) {
            console.error("Erro ao iniciar jornada:", error);
            res.status(500).json({ error: 'Erro interno ao processar início de jornada.' });
        }
    }
    // --- Finalizar Manualmente ---
    static async finalizar(req, res) {
        try {
            const { kmFim, observacoes, fotoFimUrl } = req.body;
            const kmFimFloat = parseFloat(kmFim);
            const jornadaId = req.params.id;
            if (!jornadaId)
                return res.status(400).json({ error: 'ID necessário.' });
            const jornada = await prisma_1.prisma.jornada.findUnique({ where: { id: jornadaId } });
            if (!jornada)
                return res.status(404).json({ error: 'Jornada não encontrada.' });
            // Permissões
            const isDono = jornada.operadorId === req.user?.userId;
            const isGestor = ['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '');
            if (!isDono && !isGestor) {
                return res.status(403).json({ error: 'Sem permissão para fechar esta jornada.' });
            }
            // Validação de consistência
            if (kmFimFloat < jornada.kmInicio) {
                return res.status(400).json({ error: `KM Final (${kmFimFloat}) não pode ser menor que o Inicial (${jornada.kmInicio}).` });
            }
            // Validação Cruzada (Anti-Fraude)
            // Verifica se o veículo "andou pra trás" com base em abastecimentos feitos DURANTE a jornada
            const ultimoKMGlobal = await KmService_1.KmService.getUltimoKMRegistrado(jornada.veiculoId);
            // Se o KM final informado for menor que um abastecimento feito 1 hora atrás, tem algo errado.
            // (Só aplicamos essa regra se o registro global for maior que o inicio da jornada, óbvio)
            if (kmFimFloat < ultimoKMGlobal && ultimoKMGlobal > jornada.kmInicio) {
                return res.status(400).json({
                    error: `Inconsistência: Existe um registro (Abastecimento/Manutenção) com KM ${ultimoKMGlobal} posterior ao início desta jornada.`
                });
            }
            const finalizada = await prisma_1.prisma.jornada.update({
                where: { id: jornadaId },
                data: {
                    dataFim: new Date(),
                    kmFim: kmFimFloat,
                    observacoes,
                    fotoFimUrl: fotoFimUrl || null,
                },
            });
            res.json(finalizada);
        }
        catch (error) {
            console.error("Erro ao finalizar:", error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    }
    // --- Demais métodos (Listagens e Histórico) ---
    static async listarAbertas(req, res) {
        if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || ''))
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
    static async listarHistorico(req, res) {
        if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || ''))
            return res.sendStatus(403);
        try {
            const { dataInicio, dataFim, veiculoId, operadorId } = req.query;
            const where = { kmFim: { not: null } }; // Só finalizadas
            if (dataInicio)
                where.dataInicio = { gte: new Date(String(dataInicio)) };
            if (dataFim) {
                const fim = new Date(String(dataFim));
                fim.setDate(fim.getDate() + 1);
                where.dataInicio = { ...where.dataInicio, lt: fim };
            }
            if (veiculoId)
                where.veiculoId = String(veiculoId);
            if (operadorId)
                where.operadorId = String(operadorId);
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
            // Formata para o frontend
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
    // --- Deletar Jornada (Apenas Admin/Encarregado) ---
    static async delete(req, res) {
        // Apenas Gestores podem deletar
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
            console.error("Erro ao deletar jornada:", error);
            res.status(500).json({ error: 'Erro ao deletar jornada.' });
        }
    }
}
exports.JornadaController = JornadaController;
//# sourceMappingURL=JornadaController.js.map