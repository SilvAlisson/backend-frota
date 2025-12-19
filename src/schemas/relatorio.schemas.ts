import { z } from 'zod';

export const relatorioQuerySchema = z.object({
    query: z.object({
        ano: z.coerce.number({ error: "Ano inválido" })
            .int()
            .min(2000, { message: "Ano mínimo 2000" })
            .max(2100)
            .optional(),

        mes: z.coerce.number({ error: "Mês inválido" })
            .int()
            .min(1, { message: "Mês inválido (1-12)" })
            .max(12, { message: "Mês inválido (1-12)" })
            .optional(),

        veiculoId: z.string().optional()
    })
});