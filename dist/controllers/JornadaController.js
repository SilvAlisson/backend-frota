"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
const JornadaService_1 = require("../services/JornadaService");
class JornadaController {
    static async iniciar(req, res) {
        try {
            const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body;
            const operadorId = req.user?.userId;
            const kmInicioFloat = parseFloat(kmInicio);
            // Verificações básicas
            if (!operadorId)
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            if (!veiculoId || !encarregadoId || isNaN(kmInicioFloat)) {
                return res.status(400).json({ error: 'Dados inválidos (Veículo, Encarregado ou KM).' });
            }
            // 1. Validação de KM Seguro (Impede fraude ou erro de digitação grosseiro)
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            if (kmInicioFloat < ultimoKM) {
                return res.status(400).json({
                    error: `KM Inicial (${kmInicioFloat}) é menor que o histórico registrado (${ultimoKM}) deste veículo.`
                });
            }
            // 2. Regra de Negócio (CORRIGIDA): Fechar TODAS as jornadas anteriores "esquecidas"
            // Busca qualquer jornada aberta para este veículo
            const jornadasAbertasAnteriores = await prisma_1.prisma.jornada.findMany({
                where: {
                    veiculoId: veiculoId,
                    kmFim: null
                },
                orderBy: { dataInicio: 'asc' } // Fecha da mais antiga para a mais nova
            });
            const operacoes = [];
            if (jornadasAbertasAnteriores.length > 0) {
                console.log(`[Auto-Close] Encontradas ${jornadasAbertasAnteriores.length} jornadas antigas abertas para veículo ${veiculoId}. Fechando todas.`);
                for (const jornadaAntiga of jornadasAbertasAnteriores) {
                    operacoes.push(prisma_1.prisma.jornada.update({
                        where: { id: jornadaAntiga.id },
                        data: {
                            kmFim: kmInicioFloat, // Fecha com o KM de início da nova jornada
                            dataFim: new Date(),
                            observacoes: (jornadaAntiga.observacoes || '') + ' [Fechamento automático: Nova jornada iniciada]'
                        },
                    }));
                }
            }
            // 3. Criar a nova jornada
            operacoes.push(prisma_1.prisma.jornada.create({
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
            // Executa tudo em uma transação atômica
            const resultado = await prisma_1.prisma.$transaction(operacoes);
            // Retorna o último item da transação (a nova jornada criada)
            res.status(201).json(resultado[resultado.length - 1]);
        }
        catch (error) {
            console.error("Erro ao iniciar jornada:", error);
            res.status(500).json({ error: 'Erro interno ao iniciar jornada.' });
        }
    }
    static async finalizar(req, res) {
        try {
            const { kmFim, observacoes, fotoFimUrl } = req.body;
            const kmFimFloat = parseFloat(kmFim);
            const jornadaId = req.params.id;
            if (!jornadaId)
                return res.status(400).json({ error: 'ID da jornada não fornecido.' });
            const jornada = await prisma_1.prisma.jornada.findUnique({ where: { id: jornadaId } });
            if (!jornada)
                return res.status(404).json({ error: 'Jornada não encontrada.' });
            // Validação de Permissão (Apenas o dono, Admin ou Encarregado)
            const isDono = jornada.operadorId === req.user?.userId;
            const isGestor = req.user?.role === 'ADMIN' || req.user?.role === 'ENCARREGADO';
            if (!isDono && !isGestor) {
                return res.status(403).json({ error: 'Você não tem permissão para finalizar esta jornada.' });
            }
            // Validação de KM
            // O KM final não pode ser menor que o inicial da própria jornada
            if (kmFimFloat < jornada.kmInicio) {
                return res.status(400).json({ error: `KM Final (${kmFimFloat}) não pode ser menor que o KM Inicial (${jornada.kmInicio}).` });
            }
            // Validação Cruzada: Verifica se houve algum abastecimento/manutenção com KM superior nesse meio tempo
            const ultimoKMGlobal = await KmService_1.KmService.getUltimoKMRegistrado(jornada.veiculoId);
            // Se o KM informado for menor que o histórico global (e o histórico já avançou além do início desta jornada)
            if (kmFimFloat < ultimoKMGlobal && ultimoKMGlobal > jornada.kmInicio) {
                return res.status(400).json({
                    error: `KM Final inválido (${kmFimFloat}). O veículo já registrou ${ultimoKMGlobal} KM em outra operação (Abastecimento/Manutenção).`
                });
            }
            const jornadaFinalizada = await prisma_1.prisma.jornada.update({
                where: { id: jornadaId },
                data: {
                    dataFim: new Date(),
                    kmFim: kmFimFloat,
                    observacoes,
                    fotoFimUrl: fotoFimUrl || null,
                },
            });
            res.json(jornadaFinalizada);
        }
        catch (error) {
            console.error("Erro ao finalizar jornada:", error);
            res.status(500).json({ error: 'Erro interno ao finalizar jornada.' });
        }
    }
    static async listarAbertas(req, res) {
        // Apenas para Gestão (Admin/Encarregado)
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const jornadas = await prisma_1.prisma.jornada.findMany({
                where: { kmFim: null },
                include: { veiculo: true, operador: true },
                orderBy: { dataInicio: 'desc' },
            });
            res.json(jornadas);
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar jornadas abertas.' });
        }
    }
    static async listarMinhasAbertas(req, res) {
        // Rota limpa: Apenas lista, sem side-effects de escrita.
        // A limpeza de jornadas antigas (17h+) agora é feita pelo Cron Job (JornadaService).
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: 'Autenticação necessária.' });
        try {
            const jornadas = await prisma_1.prisma.jornada.findMany({
                where: {
                    operadorId: userId,
                    kmFim: null
                },
                include: { veiculo: true, encarregado: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(jornadas);
        }
        catch (error) {
            console.error("Erro ao listar minhas jornadas:", error);
            res.status(500).json({ error: 'Erro ao buscar suas jornadas.' });
        }
    }
    static async verificarTimeouts(req, res) {
        try {
            // Chama o serviço que contém a lógica pesada
            await JornadaService_1.JornadaService.fecharJornadasVencidas();
            res.json({
                message: 'Verificação de timeouts executada com sucesso.',
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error("Erro ao processar timeouts:", error);
            res.status(500).json({ error: 'Erro interno ao processar timeouts.' });
        }
    }
}
exports.JornadaController = JornadaController;
//# sourceMappingURL=JornadaController.js.map