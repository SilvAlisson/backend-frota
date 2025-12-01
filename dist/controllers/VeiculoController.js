"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeiculoController = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const KmService_1 = require("../services/KmService");
// Helper function to format date
const formatDateToInput = (date) => {
    if (!date)
        return null;
    const d = new Date(date);
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return dataCorrigida.toISOString().split('T')[0];
};
class VeiculoController {
    // Usar AuthenticatedRequest aqui
    static async create(req, res) {
        // 🔒 BLOQUEIO: Só Admin (RH/Contratos futuramente)
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerir a frota.' });
        }
        try {
            const { placa, modelo, ano, tipoCombustivel, capacidadeTanque, tipoVeiculo, vencimentoCiv, vencimentoCipp } = req.body;
            if (!placa || !modelo || !ano) {
                return res.status(400).json({ error: 'Placa, modelo e ano são obrigatórios' });
            }
            const novoVeiculo = await prisma_1.prisma.veiculo.create({
                data: {
                    placa: placa.toUpperCase(),
                    modelo,
                    ano: parseInt(ano),
                    tipoCombustivel: tipoCombustivel || 'DIESEL_S10',
                    capacidadeTanque: capacidadeTanque ? parseFloat(capacidadeTanque) : null,
                    tipoVeiculo: tipoVeiculo || null,
                    vencimentoCiv: vencimentoCiv ? new Date(vencimentoCiv) : null,
                    vencimentoCipp: vencimentoCipp ? new Date(vencimentoCipp) : null,
                },
            });
            res.status(201).json(novoVeiculo);
        }
        catch (error) {
            console.error("Erro criar veículo:", error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ error: `Veículo com placa ${req.body.placa} já existe.` });
            }
            res.status(500).json({ error: 'Erro ao cadastrar veículo' });
        }
    }
    // Listagem pública para usuários logados
    static async list(req, res) {
        try {
            const veiculos = await prisma_1.prisma.veiculo.findMany({
                orderBy: { placa: 'asc' }
            });
            res.status(200).json(veiculos);
        }
        catch (error) {
            console.error("Erro listar veículos:", error);
            res.status(500).json({ error: 'Erro ao buscar veículos' });
        }
    }
    static async getById(req, res) {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            const veiculo = await prisma_1.prisma.veiculo.findUnique({ where: { id } });
            if (!veiculo)
                return res.status(404).json({ error: 'Veículo não encontrado.' });
            const ultimoKm = await KmService_1.KmService.getUltimoKMRegistrado(id);
            const veiculoFormatado = {
                ...veiculo,
                vencimentoCiv: formatDateToInput(veiculo.vencimentoCiv),
                vencimentoCipp: formatDateToInput(veiculo.vencimentoCipp),
                ultimoKm: ultimoKm
            };
            res.status(200).json(veiculoFormatado);
        }
        catch (error) {
            console.error(`Erro buscar veículo ${id}:`, error);
            res.status(500).json({ error: 'Erro ao buscar dados do veículo.' });
        }
    }
    // Usar AuthenticatedRequest aqui
    static async update(req, res) {
        // 🔒 BLOQUEIO
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerir a frota.' });
        }
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            const { placa, modelo, ano, tipoCombustivel, capacidadeTanque, tipoVeiculo, vencimentoCiv, vencimentoCipp } = req.body;
            if (!placa || !modelo || !ano) {
                return res.status(400).json({ error: 'Placa, modelo e ano são obrigatórios' });
            }
            const updatedVeiculo = await prisma_1.prisma.veiculo.update({
                where: { id },
                data: {
                    placa: placa.toUpperCase(),
                    modelo,
                    ano: parseInt(ano),
                    tipoCombustivel: tipoCombustivel || 'DIESEL_S10',
                    capacidadeTanque: capacidadeTanque ? parseFloat(capacidadeTanque) : null,
                    tipoVeiculo: tipoVeiculo || null,
                    vencimentoCiv: vencimentoCiv ? new Date(vencimentoCiv) : null,
                    vencimentoCipp: vencimentoCipp ? new Date(vencimentoCipp) : null,
                },
            });
            res.status(200).json(updatedVeiculo);
        }
        catch (error) {
            console.error(`Erro atualizar veículo ${id}:`, error);
            res.status(500).json({ error: 'Erro ao atualizar veículo.' });
        }
    }
    // Usar AuthenticatedRequest aqui
    static async delete(req, res) {
        // 🔒 BLOQUEIO
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerir a frota.' });
        }
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            await prisma_1.prisma.veiculo.delete({ where: { id } });
            res.status(200).json({ message: 'Veículo removido com sucesso.' });
        }
        catch (error) {
            console.error(`Erro deletar veículo ${id}:`, error);
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
                return res.status(409).json({ error: 'Este veículo não pode ser removido pois possui registos associados.' });
            }
            res.status(500).json({ error: 'Erro ao remover veículo.' });
        }
    }
}
exports.VeiculoController = VeiculoController;
//# sourceMappingURL=VeiculoController.js.map