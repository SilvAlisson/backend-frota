import { z } from 'zod';

export const fornecedorSchema = z.object({
    nome: z.string().min(2, { error: "Nome é obrigatório." }),

    cnpj: z.string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { error: "CNPJ inválido. Use o formato: 00.000.000/0000-00" })
        .optional()
        .nullable(),
});