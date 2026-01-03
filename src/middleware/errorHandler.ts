import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as Sentry from "@sentry/node"; // [ADICIONADO] Import do Sentry

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
    // 1. REPORTAR PARA O SENTRY
    // Só enviamos para o Sentry erros que NÃO sejam de validação (400) 
    // para focar no que é erro de sistema/banco.
    if (!(error instanceof ZodError)) {
        Sentry.captureException(error);
    }

    // Log visual no console do servidor
    console.error(`🔴 Erro em ${req.method} ${req.url}:`, error);

    // 2. Erros de Validação (Zod)
    if (error instanceof ZodError) {
        return res.status(400).json({
            error: 'Erro de validação',
            detalhes: error.issues.map((issue) => ({
                campo: issue.path.join('.'),
                mensagem: issue.message,
                codigo: issue.code
            }))
        });
    }

    // 3. Erros do Prisma (Banco de Dados)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const targets = (error.meta?.target as string[]) || [];
            return res.status(409).json({
                error: 'Conflito de dados',
                mensagem: `Já existe um registro com este(a) ${targets.join(', ')}.`
            });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Registro não encontrado.' });
        }
        if (error.code === 'P2003') {
            return res.status(409).json({
                error: 'Não é possível realizar esta operação.',
                mensagem: 'Este registro possui dependências e não pode ser alterado.'
            });
        }
    }

    // 4. Erro Genérico (Fallback) - Adicionado o eventId para rastreio fácil
    return res.status(500).json({
        error: 'Erro interno do servidor',
        mensagem: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
        sentryEventId: Sentry.lastEventId() // O usuário pode te passar esse código se o sistema travar
    });
};