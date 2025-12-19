import { z } from 'zod';

export const produtoSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" })
            .min(2, { error: "Muito curto" })
            .transform(v => v.toUpperCase()),

        tipo: z.enum(['COMBUSTIVEL', 'ADITIVO', 'LAVAGEM', 'PECA', 'SERVICO', 'OUTRO'], {
            error: "Tipo de produto inválido"
        }),

        unidadeMedida: z.string().default('Litro'),

        marca: z.string().optional().nullable().transform(v => v || null),
        codigoBarras: z.string().optional().nullable().transform(v => v || null),

        estoqueMinimo: z.coerce.number().optional().default(0)
    })
});