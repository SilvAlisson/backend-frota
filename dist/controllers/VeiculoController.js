"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeiculoController = void 0;
const prisma_1 = require("../lib/prisma");
const KmService_1 = require("../services/KmService");
// Helper para formatar data para o input HTML (YYYY-MM-DD)
const formatDateToInput = (date) => {
    if (!date)
        return null;
    const d = new Date(date);
    // Garante que não haja perda de dia por fuso horário ao extrair Y-M-D
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return dataCorrigida.toISOString().split('T')[0];
};
class VeiculoController {
    /**
     * Cria um novo veículo.
     * Agora inclui 'marca' e inicializa 'kmAtual'.
     */
    create = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerir a frota.' });
                return;
            }
            const dados = req.body;
            const novoVeiculo = await prisma_1.prisma.veiculo.create({
                data: {
                    placa: dados.placa,
                    marca: dados.marca,
                    modelo: dados.modelo,
                    ano: dados.ano,
                    tipoCombustivel: dados.tipoCombustivel,
                    status: dados.status || 'ATIVO',
                    capacidadeTanque: dados.capacidadeTanque ?? null,
                    tipoVeiculo: dados.tipoVeiculo ?? null,
                    vencimentoCiv: dados.vencimentoCiv ?? null,
                    vencimentoCipp: dados.vencimentoCipp ?? null,
                },
            });
            res.status(201).json(novoVeiculo);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Lista veículos para a tabela.
     * O Prisma retorna as datas (vencimento) como ISO Strings, o que é perfeito para o Frontend.
     */
    list = async (req, res, next) => {
        try {
            const veiculos = await prisma_1.prisma.veiculo.findMany({
                orderBy: { placa: 'asc' }
            });
            res.status(200).json(veiculos);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Busca veículo para Edição.
     * Formata as datas para YYYY-MM-DD para preencher os inputs date corretamente.
     */
    getById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }
            const veiculo = await prisma_1.prisma.veiculo.findUnique({ where: { id } });
            if (!veiculo) {
                res.status(404).json({ error: 'Veículo não encontrado.' });
                return;
            }
            // Busca o KM real (pode ser redundante se confiarmos no kmAtual da tabela, mas é mais seguro)
            const ultimoKm = await KmService_1.KmService.getUltimoKMRegistrado(id);
            const veiculoFormatado = {
                ...veiculo,
                kmAtual: ultimoKm, // Garante que o frontend receba o KM mais atualizado possível
                vencimentoCiv: formatDateToInput(veiculo.vencimentoCiv),
                vencimentoCipp: formatDateToInput(veiculo.vencimentoCipp),
            };
            res.status(200).json(veiculoFormatado);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }
            const dados = req.body;
            const updatedVeiculo = await prisma_1.prisma.veiculo.update({
                where: { id },
                data: {
                    placa: dados.placa,
                    marca: dados.marca, // <--- ADICIONADO
                    modelo: dados.modelo,
                    ano: dados.ano,
                    tipoCombustivel: dados.tipoCombustivel,
                    status: dados.status,
                    capacidadeTanque: dados.capacidadeTanque ?? null,
                    tipoVeiculo: dados.tipoVeiculo ?? null,
                    vencimentoCiv: dados.vencimentoCiv ?? null,
                    vencimentoCipp: dados.vencimentoCipp ?? null,
                    // Nota: Não atualizamos kmAtual aqui diretamente para evitar inconsistência com o histórico.
                    // O KM deve ser atualizado via Abastecimento ou Jornada.
                },
            });
            res.status(200).json(updatedVeiculo);
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
                res.status(400).json({ error: 'ID inválido' });
                return;
            }
            await prisma_1.prisma.veiculo.delete({ where: { id } });
            res.status(200).json({ message: 'Veículo removido com sucesso.' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.VeiculoController = VeiculoController;
//# sourceMappingURL=VeiculoController.js.map