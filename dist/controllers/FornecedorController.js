"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FornecedorController = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
class FornecedorController {
    static async create(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado' });
        try {
            const { nome, cnpj, tipo } = req.body;
            const fornecedor = await prisma_1.prisma.fornecedor.create({
                data: {
                    nome,
                    // CORREÇÃO: Garante que se for undefined, envia null
                    cnpj: cnpj ?? null,
                    tipo
                }
            });
            res.status(201).json(fornecedor);
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Fornecedor já existe (Nome ou CNPJ duplicado).' });
            }
            console.error("Erro ao criar fornecedor:", e);
            res.status(500).json({ error: 'Erro ao criar fornecedor' });
        }
    }
    static async list(req, res) {
        try {
            const list = await prisma_1.prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
            res.json(list);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao listar' });
        }
    }
    static async getById(req, res) {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            const f = await prisma_1.prisma.fornecedor.findUnique({ where: { id } });
            f ? res.json(f) : res.status(404).json({ error: 'Não encontrado' });
        }
        catch (e) {
            res.status(500).json({ error: 'Erro interno' });
        }
    }
    static async update(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado' });
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            const { nome, cnpj, tipo } = req.body;
            const updated = await prisma_1.prisma.fornecedor.update({
                where: { id },
                data: {
                    nome,
                    cnpj: cnpj ?? null,
                    tipo
                }
            });
            res.json(updated);
        }
        catch (e) {
            console.error("Erro ao atualizar fornecedor:", e);
            res.status(500).json({ error: 'Erro ao atualizar' });
        }
    }
    static async delete(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado' });
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            await prisma_1.prisma.fornecedor.delete({ where: { id } });
            res.json({ message: 'Removido' });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
                return res.status(409).json({ error: 'Não é possível remover: Fornecedor em uso por abastecimentos ou OS.' });
            }
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}
exports.FornecedorController = FornecedorController;
//# sourceMappingURL=FornecedorController.js.map