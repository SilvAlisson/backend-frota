import { z } from 'zod';

export const fornecedorSchema = z.object({
    nome: z.string().min(2, "Nome é obrigatório."),

    // Valida o formato: 00.000.000/0000-00
    cnpj: z.string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato: 00.000.000/0000-00")
        .optional()
        .nullable(),
});