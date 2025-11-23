import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma, TipoProduto } from '@prisma/client';

export class ProdutoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado.' });
        try {
            const { nome, tipo, unidadeMedida } = req.body;

            // Validação do Enum TipoProduto
            if (!(tipo in TipoProduto)) {
                return res.status(400).json({ error: `Tipo inválido. Valores: ${Object.values(TipoProduto).join(', ')}` });
            }

            const produto = await prisma.produto.create({
                data: { nome, tipo, unidadeMedida: unidadeMedida || 'Litro' }
            });
            res.status(201).json(produto);
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Produto com este nome já existe.' });
            }
            res.status(500).json({ error: 'Erro ao criar produto' });
        }
    }

    static async list(req: AuthenticatedRequest, res: Response) {
        try {
            const produtos = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
            res.json(produtos);
        } catch (e) { res.status(500).json({ error: 'Erro ao listar produtos' }); }
    }

    static async getById(req: AuthenticatedRequest, res: Response) {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            const produto = await prisma.produto.findUnique({ where: { id } });
            produto ? res.json(produto) : res.status(404).json({ error: 'Não encontrado' });
        } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            const { nome, tipo, unidadeMedida } = req.body;

            // Validação do Enum se for enviado
            if (tipo && !(tipo in TipoProduto)) {
                return res.status(400).json({ error: 'Tipo inválido.' });
            }

            const updated = await prisma.produto.update({
                where: { id },
                data: { nome, tipo, unidadeMedida }
            });
            res.json(updated);
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Nome de produto já existe.' });
            }
            res.status(500).json({ error: 'Erro ao atualizar' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            await prisma.produto.delete({ where: { id } });
            res.json({ message: 'Removido com sucesso' });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2003' || e.code === 'P2014')) {
                return res.status(409).json({ error: 'Produto em uso (histórico de abastecimento/manutenção).' });
            }
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}