import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';

export const validate = (schema: ZodType<any, any>) => async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // 1. Validação assíncrona
        const result = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (result.body) req.body = result.body;
        if (result.query) req.query = result.query;
        if (result.params) req.params = result.params;

        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.issues.map((issue) => {
                const path = issue.path.join('.').replace('body.', '');
                return { field: path, message: issue.message };
            });

            return res.status(400).json({
                error: 'Dados inválidos',
                details: errorMessages
            });
        }

        console.error("Validation error:", error);
        return res.status(500).json({ error: 'Erro interno de validação' });
    }
};