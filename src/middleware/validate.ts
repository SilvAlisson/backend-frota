import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error: any) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: error.errors.map((e: any) => ({ field: e.path[0], message: e.message }))
        });
    }
};