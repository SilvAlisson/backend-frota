"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProdutoController = void 0;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
class ProdutoController {
    static async create(req, res) {
        if (req.user?.role !== 'ADMIN')
            return res.status(403).json({ error: 'Acesso negado.' });
        try {
            // req.body já validado, tipado e com defaults aplicados (unidadeMedida = Litro)
            const { nome, tipo, unidadeMedida } = req.body;
            const produto = await prisma_1.prisma.produto.create({
                data: {
                    nome,
                    tipo,
                    unidadeMedida
                }
            });
            res.status(201).json(produto);
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Produto com este nome já existe.' });
            }
            console.error("Erro ao criar produto:", e);
            res.status(500).json({ error: 'Erro ao criar produto' });
        }
    }
    static async list(req, res) {
        try {
            const produtos = await prisma_1.prisma.produto.findMany({ orderBy: { nome: 'asc' } });
            res.json(produtos);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao listar produtos' });
        }
    }
    static async getById(req, res) {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: 'ID inválido' });
        try {
            const produto = await prisma_1.prisma.produto.findUnique({ where: { id } });
            produto ? res.json(produto) : res.status(404).json({ error: 'Não encontrado' });
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
            // O Zod garante que o Tipo é válido se for enviado
            const { nome, tipo, unidadeMedida } = req.body;
            const updated = await prisma_1.prisma.produto.update({
                where: { id },
                data: { nome, tipo, unidadeMedida }
            });
            res.json(updated);
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Nome de produto já existe.' });
            }
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
            await prisma_1.prisma.produto.delete({ where: { id } });
            res.json({ message: 'Removido com sucesso' });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && (e.code === 'P2003' || e.code === 'P2014')) {
                return res.status(409).json({ error: 'Produto em uso (histórico de abastecimento/manutenção).' });
            }
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}
exports.ProdutoController = ProdutoController;
//# sourceMappingURL=ProdutoController.js.map