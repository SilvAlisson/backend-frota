"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FornecedorController = void 0;
const prisma_1 = require("../lib/prisma");
class FornecedorController {
    create = async (req, res, next) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }
            const { nome, cnpj, tipo } = req.body;
            const fornecedor = await prisma_1.prisma.fornecedor.create({
                data: {
                    nome,
                    cnpj: cnpj ?? null,
                    tipo
                }
            });
            res.status(201).json(fornecedor);
        }
        catch (error) {
            next(error);
        }
    };
    list = async (req, res, next) => {
        try {
            const list = await prisma_1.prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
            res.json(list);
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
            const f = await prisma_1.prisma.fornecedor.findUnique({ where: { id } });
            if (!f) {
                res.status(404).json({ error: 'Não encontrado' });
                return;
            }
            res.json(f);
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
            await prisma_1.prisma.fornecedor.delete({ where: { id } });
            res.json({ message: 'Removido com sucesso' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.FornecedorController = FornecedorController;
//# sourceMappingURL=FornecedorController.js.map