"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanoManutencaoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
class PlanoManutencaoController {
    create = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { veiculoId, descricao, tipoIntervalo, valorIntervalo } = req.body;
            const kmAtual = await KmService_1.KmService.getUltimoKMRegistrado(veiculoId);
            let kmProximaManutencao = null;
            let dataProximaManutencao = null;
            if (tipoIntervalo === 'KM') {
                if (valorIntervalo > 0) {
                    const multiplicador = Math.floor(kmAtual / valorIntervalo) + 1;
                    kmProximaManutencao = multiplicador * valorIntervalo;
                }
                else {
                    kmProximaManutencao = kmAtual;
                }
            }
            else if (tipoIntervalo === 'TEMPO') {
                const data = new Date();
                data.setMonth(data.getMonth() + valorIntervalo);
                dataProximaManutencao = data;
            }
            const plano = await prisma_1.prisma.planoManutencao.create({
                data: {
                    veiculoId,
                    descricao,
                    tipoIntervalo,
                    valorIntervalo,
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
            next(error);
        }
    };
    list = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
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
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID do plano não fornecido.' });
                return;
            }
            await prisma_1.prisma.planoManutencao.delete({
                where: { id }
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PlanoManutencaoController = PlanoManutencaoController;
//# sourceMappingURL=PlanoManutencaoController.js.map