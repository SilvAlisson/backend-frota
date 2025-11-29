import { z } from 'zod';

export const produtoSchema = z.object({
    nome: z.string()
        .min(2, "Nome do produto muito curto.")
        .transform(v => v.toUpperCase()),

    tipo: z.enum(['COMBUSTIVEL', 'ADITIVO', 'SERVICO', 'OUTRO'], {
        message: "Tipo de produto inválido."
    }),

    unidadeMedida: z.string().default('Litro'),
});