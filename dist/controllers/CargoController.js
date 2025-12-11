"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CargoController = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client"); // Importar Prisma para tratar erros
class CargoController {
    // Criar Cargo + Requisitos iniciais
    static async create(req, res) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            const { nome, descricao, requisitos } = req.body;
            const cargo = await prisma_1.prisma.cargo.create({
                data: {
                    nome,
                    descricao: descricao ?? null,
                    ...(requisitos && requisitos.length > 0 ? {
                        requisitos: {
                            create: requisitos
                        }
                    } : {})
                },
                include: { requisitos: true }
            });
            res.status(201).json(cargo);
        }
        catch (e) {
            // Tratamento de erro do Prisma (P2002 = Unique Constraint)
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Já existe um cargo com este nome.' });
            }
            console.error("Erro ao criar cargo:", e);
            res.status(500).json({ error: 'Erro ao criar cargo.' });
        }
    }
    static async list(req, res) {
        try {
            const cargos = await prisma_1.prisma.cargo.findMany({
                include: {
                    requisitos: true,
                    _count: { select: { colaboradores: true } }
                },
                orderBy: { nome: 'asc' }
            });
            res.json(cargos);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao listar cargos.' });
        }
    }
    static async delete(req, res) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: "ID inválido." });
        try {
            await prisma_1.prisma.cargo.delete({ where: { id } });
            res.json({ message: 'Cargo removido com sucesso.' });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
                return res.status(409).json({ error: 'Não é possível remover cargo com colaboradores vinculados.' });
            }
            res.status(500).json({ error: 'Erro ao remover cargo.' });
        }
    }
    // Adicionar um novo treinamento a um cargo existente
    static async addRequisito(req, res) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || ''))
            return res.sendStatus(403);
        const { id: cargoId } = req.params;
        if (!cargoId)
            return res.status(400).json({ error: "ID do cargo inválido" });
        try {
            const dados = req.body;
            const cargoExiste = await prisma_1.prisma.cargo.findUnique({ where: { id: cargoId } });
            if (!cargoExiste)
                return res.status(404).json({ error: "Cargo não encontrado" });
            const requisito = await prisma_1.prisma.treinamentoObrigatorio.create({
                data: {
                    cargo: {
                        connect: { id: cargoId }
                    },
                    nome: dados.nome,
                    validadeMeses: dados.validadeMeses,
                    diasAntecedenciaAlerta: dados.diasAntecedenciaAlerta
                }
            });
            res.json(requisito);
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Erro ao adicionar requisito.' });
        }
    }
    static async removeRequisito(req, res) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || ''))
            return res.sendStatus(403);
        const { requisitoId } = req.params;
        if (!requisitoId)
            return res.status(400).json({ error: "ID do requisito inválido" });
        try {
            await prisma_1.prisma.treinamentoObrigatorio.delete({ where: { id: requisitoId } });
            res.json({ message: 'Requisito removido.' });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                return res.status(404).json({ error: 'Requisito não encontrado.' });
            }
            res.status(500).json({ error: 'Erro ao remover requisito.' });
        }
    }
}
exports.CargoController = CargoController;
//# sourceMappingURL=CargoController.js.map