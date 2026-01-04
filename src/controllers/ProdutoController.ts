import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { produtoSchema } from '../schemas/produto.schemas';

// Extraímos a tipagem do schema
type ProdutoData = z.infer<typeof produtoSchema>['body'];

export class ProdutoController {

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { nome, tipo, unidadeMedida } = req.body as ProdutoData;

            const produto = await prisma.produto.create({
                data: {
                    nome,
                    tipo,
                    unidadeMedida
                }
            });
            res.status(201).json(produto);
        } catch (error) {
            next(error);
        }
    }

    list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const produtos = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
            res.json(produtos);
        } catch (error) {
            next(error);
        }
    }

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }

            const produto = await prisma.produto.findUnique({ where: { id } });
            if (!produto) {
                res.status(404).json({ error: 'Não encontrado' });
                return;
            }
            res.json(produto);
        } catch (error) {
            next(error);
        }
    }

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

            const { nome, tipo, unidadeMedida } = req.body as ProdutoData;

            const updated = await prisma.produto.update({
                where: { id },
                data: { nome, tipo, unidadeMedida }
            });
            res.json(updated);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

            await prisma.produto.delete({ where: { id } });
            res.json({ message: 'Removido com sucesso' });
        } catch (error) {
            next(error);
        }
    }
}