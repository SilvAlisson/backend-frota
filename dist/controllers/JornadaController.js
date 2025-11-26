"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
class JornadaController {
    static async iniciar(req, res) {
        try {
            const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body;
            const operadorId = req.user?.userId;
            const kmInicioFloat = parseFloat(kmInicio);
            // Verificação explícita do operadorId
            if (!operadorId) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }
            if (!veiculoId || !encarregadoId || isNaN(kmInicioFloat)) {
                return res.status(400).json({ error: 'Dados inválidos.' });
            }
            // 1. Validação de KM Seguro
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            if (kmInicioFloat < ultimoKM) {
                return res.status(400).json({
                    error: `KM Inicial (${kmInicioFloat}) é menor que o histórico (${ultimoKM}).`
                });
            }
            // 2. Fechar jornada anterior automaticamente se houver (Regra de Negócio)
            const ultimaJornadaVeiculo = await prisma_1.prisma.jornada.findFirst({
                where: { veiculoId, kmFim: null },
                orderBy: { dataInicio: 'desc' },
            });
            const operacoes = [];
            if (ultimaJornadaVeiculo) {
                operacoes.push(prisma_1.prisma.jornada.update({
                    where: { id: ultimaJornadaVeiculo.id },
                    data: { kmFim: kmInicioFloat, dataFim: new Date() },
                }));
            }
            // 3. Criar nova jornada
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
            const resultado = await prisma_1.prisma.$transaction(operacoes);
            res.status(201).json(resultado[resultado.length - 1]);
        }
        catch (error) {
            console.error("Erro iniciar jornada:", error);
            res.status(500).json({ error: 'Erro ao iniciar jornada' });
        }
    }
    static async finalizar(req, res) {
        try {
            const { kmFim, observacoes, fotoFimUrl } = req.body;
            const kmFimFloat = parseFloat(kmFim);
            const jornadaId = req.params.id;
            // Verificação explícita do ID da rota
            if (!jornadaId) {
                return res.status(400).json({ error: 'ID da jornada não fornecido.' });
            }
            const jornada = await prisma_1.prisma.jornada.findUnique({ where: { id: jornadaId } });
            if (!jornada)
                return res.status(404).json({ error: 'Jornada não encontrada.' });
            // Validação de Permissão (Operador dono ou Gestores)
            if (jornada.operadorId !== req.user?.userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                return res.status(403).json({ error: 'Sem permissão para finalizar esta jornada.' });
            }
            // Validação de KM Cruzada
            const ultimoKM = await KmService_1.KmService.getUltimoKMRegistrado(jornada.veiculoId);
            // Se o KM informado for menor que o histórico global E o histórico já avançou além do início desta jornada
            if (kmFimFloat < ultimoKM && ultimoKM > jornada.kmInicio) {
                return res.status(400).json({
                    error: `KM Final (${kmFimFloat}) inválido. O veículo já registrou ${ultimoKM} KM em outra operação.`
                });
            }
            if (kmFimFloat < jornada.kmInicio) {
                return res.status(400).json({ error: 'KM Final não pode ser menor que o Inicial.' });
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
            console.error("Erro finalizar jornada:", error);
            res.status(500).json({ error: 'Erro ao finalizar jornada' });
        }
    }
    static async listarAbertas(req, res) {
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
            res.status(500).json({ error: 'Erro ao buscar jornadas' });
        }
    }
    static async listarMinhasAbertas(req, res) {
        // Verificação explícita do userId antes da query
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }
        try {
            const jornadas = await prisma_1.prisma.jornada.findMany({
                where: {
                    operadorId: userId, // Agora garantimos que é string
                    kmFim: null
                },
                include: { veiculo: true, encarregado: true },
                orderBy: { dataInicio: 'desc' }
            });
            // Lógica de Timeout (17h) - Auto-fechamento
            const agora = new Date();
            const updatesBatch = [];
            const jornadasAtivas = [];
            for (const j of jornadas) {
                const horasPassadas = (agora.getTime() - new Date(j.dataInicio).getTime()) / (1000 * 60 * 60);
                if (horasPassadas > 17) {
                    updatesBatch.push(prisma_1.prisma.jornada.update({
                        where: { id: j.id },
                        data: {
                            kmFim: j.kmInicio,
                            dataFim: agora,
                            observacoes: (j.observacoes || '') + ' [Fechada automaticamente: Timeout 17h]'
                        }
                    }));
                }
                else {
                    jornadasAtivas.push(j);
                }
            }
            if (updatesBatch.length > 0)
                await prisma_1.prisma.$transaction(updatesBatch);
            res.json(jornadasAtivas);
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao buscar jornadas' });
        }
    }
}
exports.JornadaController = JornadaController;
//# sourceMappingURL=JornadaController.js.map