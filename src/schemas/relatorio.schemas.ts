import { z } from 'zod';

export const relatorioQuerySchema = z.object({
    query: z.object({
        // Coerce transforma "2024" (string da URL) em 2024 (number)
        ano: z.coerce.number({ error: "Ano inválido" })
            .int()
            .min(2000)
            .max(2100)
            .optional(),

        mes: z.coerce.number({ error: "Mês inválido" })
            .int()
            .min(1)
            .max(12)
            .optional(),

        veiculoId: z.string().optional()
    })
});