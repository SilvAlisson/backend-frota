import { Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { fornecedorSchema } from '../schemas/fornecedor.schemas';

// Extraímos o tipo limpo diretamente do schema
type FornecedorData = z.infer<typeof fornecedorSchema>['body'];

export class FornecedorController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        try {
            const { nome, cnpj, tipo } = req.body as FornecedorData;

            const fornecedor = await prisma.fornecedor.create({
                data: {
                    nome,
                    // CORREÇÃO: Garante que se for undefined, envia null
                    cnpj: cnpj ?? null,
                    tipo
                }
            });

            res.status(201).json(fornecedor);
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                return res.status(409).json({ error: 'Fornecedor já existe (Nome ou CNPJ duplicado).' });
            }
            console.error("Erro ao criar fornecedor:", e);
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
            const { nome, cnpj, tipo } = req.body as FornecedorData;

            const updated = await prisma.fornecedor.update({
                where: { id },
                data: {
                    nome,
                    cnpj: cnpj ?? null,
                    tipo
                }
            });
            res.json(updated);
        } catch (e) {
            console.error("Erro ao atualizar fornecedor:", e);
            res.status(500).json({ error: 'Erro ao atualizar' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            await prisma.fornecedor.delete({ where: { id } });
            res.json({ message: 'Removido' });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
                return res.status(409).json({ error: 'Não é possível remover: Fornecedor em uso por abastecimentos ou OS.' });
            }
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}