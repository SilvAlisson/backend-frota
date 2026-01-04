"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProdutoController = void 0;
const prisma_1 = require("../lib/prisma");
class ProdutoController {
    create = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
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
        catch (error) {
            next(error);
        }
    };
    list = async (req, res, next) => {
        try {
            const produtos = await prisma_1.prisma.produto.findMany({ orderBy: { nome: 'asc' } });
            res.json(produtos);
        }
        catch (error) {
            next(error);
        }
    };
    getById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }
            const produto = await prisma_1.prisma.produto.findUnique({ where: { id } });
            if (!produto) {
                res.status(404).json({ error: 'Não encontrado' });
                return;
            }
            res.json(produto);
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }
            const { nome, tipo, unidadeMedida } = req.body;
            const updated = await prisma_1.prisma.produto.update({
                where: { id },
                data: { nome, tipo, unidadeMedida }
            });
            res.json(updated);
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }
            await prisma_1.prisma.produto.delete({ where: { id } });
            res.json({ message: 'Removido com sucesso' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ProdutoController = ProdutoController;
//# sourceMappingURL=ProdutoController.js.map