import { z } from 'zod';

export const veiculoSchema = z.object({
    placa: z.string()
        .length(7, { error: "A placa deve ter exatamente 7 caracteres." })
        .transform(v => v.toUpperCase()),

    modelo: z.string().min(2, { error: "Modelo deve ter pelo menos 2 caracteres." }),

    ano: z.number({ error: "Ano é obrigatório e deve ser numérico." })
        .int()
        .min(1900, { error: "Ano inválido." })
        .max(new Date().getFullYear() + 1, { error: "Ano não pode ser futuro." }),

    tipoVeiculo: z.string().optional().nullable(),

    tipoCombustivel: z.enum(['DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV'], {
        error: "Tipo de combustível inválido"
    }).default('DIESEL_S10'),

    capacidadeTanque: z.number().positive().optional().nullable(),

    vencimentoCiv: z.coerce.date().optional().nullable(),
    vencimentoCipp: z.coerce.date().optional().nullable(),
});