import { z } from 'zod';

const TipoFornecedorSchema = z.enum(['POSTO', 'OFICINA', 'LAVA_JATO', 'SEGURADORA', 'OUTROS'], {
    error: "Tipo inválido"
});

export const fornecedorSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome é obrigatório" }).min(2),

        tipo: TipoFornecedorSchema.optional().default('OUTROS'),

        cnpj: z.union([
            z.string().length(0),
            z.null(),
            z.undefined(),
            z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido" })
        ]).optional().transform(e => e === "" ? null : e),
    })
});