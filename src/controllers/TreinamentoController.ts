import { Response, Request, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { createTreinamentoSchema, importTreinamentosSchema } from '../schemas/treinamentos.schemas';

// Extração de Tipos
type CreateTreinamentoData = z.infer<typeof createTreinamentoSchema>['body'];
type ImportTreinamentosData = z.infer<typeof importTreinamentosSchema>['body'];

export class TreinamentoController {

    // Cadastrar um treinamento (Manual)
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

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
                    descricao: descricao ?? null,
                    dataVencimento: dataVencimento ?? null,
                    comprovanteUrl: comprovanteUrl ?? null
                }
            });
            res.status(201).json(treinamento);
        } catch (error) {
            next(error);
        }
    }

    // Importação em massa via Excel
    importar = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { userId, treinamentos } = req.body as ImportTreinamentosData;

            // createMany é otimizado para inserções em lote
            const resultado = await prisma.treinamento.createMany({
                data: treinamentos.map(t => ({
                    userId,
                    nome: t.nome,
                    dataRealizacao: t.dataRealizacao,
                    descricao: t.descricao ?? null,
                    dataVencimento: t.dataVencimento ?? null,
                    comprovanteUrl: null
                }))
            });

            res.status(201).json({
                message: 'Importação concluída com sucesso',
                count: resultado.count
            });
        } catch (error) {
            next(error);
        }
    }

    // Listar treinamentos de um usuário
    listByUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({ error: "ID de usuário inválido" });
                return;
            }

            const treinamentos = await prisma.treinamento.findMany({
                where: { userId },
                orderBy: { dataRealizacao: 'desc' }
            });
            res.json(treinamentos);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: "ID inválido" });
                return;
            }

            await prisma.treinamento.delete({ where: { id } });
            res.json({ message: 'Registro removido.' });
        } catch (error) {
            next(error);
        }
    }
}