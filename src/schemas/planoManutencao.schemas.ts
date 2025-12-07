import { z } from 'zod';

export const planoManutencaoSchema = z.object({
    body: z.object({
        veiculoId: z.string({ error: "Veículo é obrigatório" }).min(1),

        descricao: z.string({ error: "Descrição é obrigatória" })
            .min(3, { error: "Descrição muito curta" }),

        tipoIntervalo: z.enum(['KM', 'TEMPO'], {
            error: "Tipo de intervalo inválido. Use 'KM' ou 'TEMPO'."
        }),

        // Zod coerce já converte string para número
        valorIntervalo: z.coerce.number({ error: "Valor do intervalo inválido" })
            .positive({ error: "O intervalo deve ser positivo" })
    })
});