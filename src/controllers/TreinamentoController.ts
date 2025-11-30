import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

// --- Schemas ---

const createTreinamentoSchema = z.object({
    userId: z.string().uuid(),
    nome: z.string().min(2, "Nome do treinamento obrigatório"),
    descricao: z.string().optional().nullable(),
    dataRealizacao: z.coerce.date(),
    dataVencimento: z.coerce.date().optional().nullable(),
    comprovanteUrl: z.string().url().optional().nullable(),
});

const userIdParamSchema = z.object({
    userId: z.string().uuid("ID de usuário inválido")
});

const idParamSchema = z.object({
    id: z.string().min(1, "ID obrigatório")
});

// ----------------

export class TreinamentoController {

    // Cadastrar um treinamento para um usuário
    static async create(req: AuthenticatedRequest, res: Response) {
        // Apenas RH ou Admin pode lançar
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const validation = createTreinamentoSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: validation.error.format() });
        }

        const { userId, nome, dataRealizacao, descricao, dataVencimento, comprovanteUrl } = validation.data;

        try {
            const treinamento = await prisma.treinamento.create({
                data: {
                    // Conecta ao usuário existente
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao,
                    // Garante que undefined vire null para satisfazer o Prisma
                    descricao: descricao ?? null,
                    dataVencimento: dataVencimento ?? null,
                    comprovanteUrl: comprovanteUrl ?? null
                }
            });
            res.status(201).json(treinamento);
        } catch (e: any) {
            console.error(e);
            res.status(500).json({ error: 'Erro ao registrar treinamento.' });
        }
    }

    // Listar treinamentos de um usuário específico
    static async listByUser(req: AuthenticatedRequest, res: Response) {
        // Valida req.params para garantir que userId existe e é string
        const paramsCheck = userIdParamSchema.safeParse(req.params);
        if (!paramsCheck.success) {
            return res.status(400).json({ error: "ID de usuário inválido" });
        }

        const { userId } = paramsCheck.data;

        try {
            const treinamentos = await prisma.treinamento.findMany({
                where: { userId },
                orderBy: { dataRealizacao: 'desc' }
            });
            res.json(treinamentos);
        } catch (e: any) {
            res.status(500).json({ error: 'Erro ao buscar treinamentos.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.sendStatus(403);

        // Valida req.params para garantir que id existe
        const paramsCheck = idParamSchema.safeParse(req.params);
        if (!paramsCheck.success) {
            return res.status(400).json({ error: "ID inválido" });
        }

        const { id } = paramsCheck.data;

        try {
            await prisma.treinamento.delete({ where: { id } });
            res.json({ message: 'Registro removido.' });
        } catch (e: any) {
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}