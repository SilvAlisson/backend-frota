import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

export class FornecedorController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
        try {
            const { nome, cnpj } = req.body;
            if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

            const fornecedor = await prisma.fornecedor.create({ data: { nome, cnpj } });
            res.status(201).json(fornecedor);
        } catch (e) {
            // Tratamento de erro de unicidade (P2002)
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Fornecedor já existe.' });
            }
            res.status(500).json({ error: 'Erro ao criar fornecedor' });
        }
    }

    static async list(req: AuthenticatedRequest, res: Response) {
        try {
            const list = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
            res.json(list);
        } catch (e) { res.status(500).json({ error: 'Erro ao listar' }); }
    }

    static async getById(req: AuthenticatedRequest, res: Response) {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            const f = await prisma.fornecedor.findUnique({ where: { id } });
            f ? res.json(f) : res.status(404).json({ error: 'Não encontrado' });
        } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            const updated = await prisma.fornecedor.update({
                where: { id },
                data: {
                    nome: req.body.nome,
                    cnpj: req.body.cnpj || null
                }
            });
            res.json(updated);
        } catch (e) { res.status(500).json({ error: 'Erro ao atualizar' }); }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            await prisma.fornecedor.delete({ where: { id } });
            res.json({ message: 'Removido' });
        } catch (e) {
            // Tratamento para erro de chave estrangeira (se estiver em uso)
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
                return res.status(409).json({ error: 'Não é possível remover: Fornecedor em uso.' });
            }
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}