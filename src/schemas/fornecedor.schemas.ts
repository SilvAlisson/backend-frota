import { z } from 'zod';

const TipoFornecedorSchema = z.enum(['POSTO', 'OFICINA', 'LAVA_JATO', 'SEGURADORA', 'OUTROS'], {
    error: "Tipo inválido"
});

export const fornecedorSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome é obrigatório" }).min(2, { message: "Nome muito curto" }),

        tipo: TipoFornecedorSchema.optional().default('OUTROS'),

        cnpj: z.string()
            .optional()
            .nullable()
            .refine((val) => !val || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(val), {
                message: "CNPJ inválido (00.000.000/0000-00)"
            })
            .transform(v => v || null),
    })
});