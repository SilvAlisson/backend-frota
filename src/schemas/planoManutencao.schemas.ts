import { z } from 'zod';

export const planoManutencaoSchema = z.object({
    body: z.object({
        veiculoId: z.string({ error: "Veículo é obrigatório" })
            .min(1, { message: "Veículo é obrigatório" }),

        descricao: z.string({ error: "Descrição é obrigatória" })
            .min(3, { message: "Descrição muito curta" }),

        tipoIntervalo: z.enum(['KM', 'TEMPO'], {
            error: "Tipo de intervalo inválido. Use 'KM' ou 'TEMPO'."
        }),

        valorIntervalo: z.coerce.number({ error: "Valor do intervalo inválido" })
            .positive({ message: "O intervalo deve ser positivo" })
    })
});