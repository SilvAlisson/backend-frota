import { Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { createTreinamentoSchema, importTreinamentosSchema } from '../schemas/treinamentos.schemas';

// Extração de Tipos
type CreateTreinamentoData = z.infer<typeof createTreinamentoSchema>['body'];
type ImportTreinamentosData = z.infer<typeof importTreinamentosSchema>['body'];

export class TreinamentoController {

    // Cadastrar um treinamento (Manual)
    static async create(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        try {
            // Dados já validados pelo middleware
            const {
                userId,
                nome,
                dataRealizacao,
                descricao,
                dataVencimento,
                comprovanteUrl
            } = req.body as CreateTreinamentoData;

            const treinamento = await prisma.treinamento.create({
                data: {
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao,

                    // CORREÇÃO: Forçar null se for undefined
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

        try {
            const { userId, treinamentos } = req.body as ImportTreinamentosData;

            // createMany é otimizado para inserções em lote
            const resultado = await prisma.treinamento.createMany({
                data: treinamentos.map(t => ({
                    userId,
                    nome: t.nome,
                    dataRealizacao: t.dataRealizacao,

                    descricao: t.descricao ?? null,
                    dataVencimento: t.dataVencimento ?? null,
                    comprovanteUrl: null // Importação geralmente não tem comprovante
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
        const { userId } = req.params;

        if (!userId) return res.status(400).json({ error: "ID de usuário inválido" });

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

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "ID inválido" });

        try {
            await prisma.treinamento.delete({ where: { id } });
            res.json({ message: 'Registro removido.' });
        } catch (e: any) {
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}