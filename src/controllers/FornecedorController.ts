import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { fornecedorSchema } from '../schemas/fornecedor.schemas';
import { Prisma } from '@prisma/client';

// Extraímos o tipo limpo diretamente do schema
type FornecedorData = z.infer<typeof fornecedorSchema>['body'];

export class FornecedorController {

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const { nome, cnpj, tipo } = req.body as FornecedorData;

            const fornecedor = await prisma.fornecedor.create({
                data: {
                    nome,
                    cnpj: cnpj ?? null,
                    tipo
                }
            });

            res.status(201).json(fornecedor);
        } catch (error) {
            next(error);
        }
    }

    list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const list = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
            res.json(list);
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

            const f = await prisma.fornecedor.findUnique({ where: { id } });
            if (!f) {
                res.status(404).json({ error: 'Não encontrado' });
                return;
            }
            res.json(f);
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

            const { nome, cnpj, tipo } = req.body as FornecedorData;

            // Se o ID não existir, o Prisma lança erro P2025, que o middleware converte em 404
            const updated = await prisma.fornecedor.update({
                where: { id },
                data: {
                    nome,
                    cnpj: cnpj ?? null,
                    tipo
                }
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

            await prisma.fornecedor.delete({ where: { id } });
            res.json({ message: 'Removido com sucesso' });
        } catch (error) {
            next(error);
        }
    }
}