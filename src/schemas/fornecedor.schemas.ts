import { z } from 'zod';

const TipoFornecedorSchema = z.enum(['POSTO', 'OFICINA', 'LAVA_JATO', 'SEGURADORA', 'OUTROS'], {
    error: "Tipo de fornecedor inválido."
});

export const fornecedorSchema = z.object({
    nome: z.string().min(2, { error: "Nome é obrigatório." }),

    tipo: TipoFornecedorSchema,

    // Mantida a validação de CNPJ, permitindo que seja um CNPJ válido OU vazio/null.
    cnpj: z.union([
        z.literal(''),
        z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido. Use o formato: 00.000.000/0000-00" }),
    ])
        .optional()
        .nullable(),
});