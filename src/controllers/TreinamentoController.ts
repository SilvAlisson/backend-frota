import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { createTreinamentoSchema, importTreinamentosSchema } from '../schemas/treinamentos.schemas';

// Schemas Locais para IDs
const userIdParamSchema = z.object({
    userId: z.string().min(1, { error: "ID de usuário inválido" })
});

const idParamSchema = z.object({
    id: z.string().min(1, { error: "ID obrigatório" })
});

export class TreinamentoController {

    // Cadastrar um treinamento (Manual)
    static async create(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const validation = createTreinamentoSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }

        const { userId, nome, dataRealizacao, descricao, dataVencimento, comprovanteUrl } = validation.data;

        try {
            const treinamento = await prisma.treinamento.create({
                data: {
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao,
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

    // Importação em massa via Excel
    static async importar(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const validation = importTreinamentosSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados de importação inválidos',
                details: validation.error.format()
            });
        }

        const { userId, treinamentos } = validation.data;

        try {
            // createMany é otimizado para inserções em lote
            const resultado = await prisma.treinamento.createMany({
                data: treinamentos.map(t => ({
                    userId,
                    nome: t.nome,
                    descricao: t.descricao || null,
                    dataRealizacao: t.dataRealizacao,
                    dataVencimento: t.dataVencimento || null,
                    comprovanteUrl: null
                }))
            });

            res.status(201).json({
                message: 'Importação concluída com sucesso',
                count: resultado.count
            });
        } catch (e: any) {
            console.error("Erro na importação:", e);
            res.status(500).json({ error: 'Erro ao importar treinamentos.' });
        }
    }

    // Listar treinamentos
    static async listByUser(req: AuthenticatedRequest, res: Response) {
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