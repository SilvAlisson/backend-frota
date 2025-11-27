"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanoManutencaoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
class PlanoManutencaoController {
    static async create(req, res) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const { veiculoId, descricao, tipoIntervalo, valorIntervalo } = req.body;
            if (!veiculoId || !descricao || !tipoIntervalo || !valorIntervalo) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
            }
            const kmAtual = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            let kmProximaManutencao = null;
            let dataProximaManutencao = null;
            if (tipoIntervalo === 'KM') {
                kmProximaManutencao = kmAtual + parseFloat(valorIntervalo);
            }
            else if (tipoIntervalo === 'TEMPO') {
                const data = new Date();
                data.setMonth(data.getMonth() + parseInt(valorIntervalo));
                dataProximaManutencao = data;
            }
            const plano = await prisma_1.prisma.planoManutencao.create({
                data: {
                    veiculoId,
                    descricao,
                    tipoIntervalo,
                    valorIntervalo: parseFloat(valorIntervalo),
                    kmProximaManutencao,
                    dataProximaManutencao,
                },
                include: {
                    veiculo: {
                        select: { placa: true, modelo: true }
                    }
                }
            });
            res.status(201).json(plano);
        }
        catch (error) {
            console.error("Erro ao criar plano:", error);
            res.status(500).json({ error: 'Erro ao criar plano de manutenção.' });
        }
    }
    static async list(req, res) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const planos = await prisma_1.prisma.planoManutencao.findMany({
                include: {
                    veiculo: {
                        select: { placa: true, modelo: true }
                    }
                },
                orderBy: {
                    veiculo: { placa: 'asc' }
                }
            });
            res.json(planos);
        }
        catch (error) {
            console.error("Erro ao listar planos:", error);
            res.status(500).json({ error: 'Erro ao listar planos.' });
        }
    }
    static async delete(req, res) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID do plano não fornecido.' });
        try {
            await prisma_1.prisma.planoManutencao.delete({
                where: { id }
            });
            res.status(204).send();
        }
        catch (error) {
            console.error("Erro ao deletar plano:", error);
            res.status(500).json({ error: 'Erro ao deletar plano.' });
        }
    }
}
exports.PlanoManutencaoController = PlanoManutencaoController;
//# sourceMappingURL=PlanoManutencaoController.js.map