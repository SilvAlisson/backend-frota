import { z } from 'zod';

export const veiculoSchema = z.object({
    placa: z.string()
        .length(7, "A placa deve ter exatamente 7 caracteres.")
        .transform(v => v.toUpperCase()),

    modelo: z.string().min(2, "Modelo deve ter pelo menos 2 caracteres."),

    ano: z.number({ message: "Ano é obrigatório." })
        .int()
        .min(1900, "Ano inválido.")
        .max(new Date().getFullYear() + 1, "Ano não pode ser futuro."),

    tipoVeiculo: z.string().optional().nullable(),

    tipoCombustivel: z.enum(['DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV']).default('DIESEL_S10'),

    capacidadeTanque: z.number().positive().optional().nullable(),

    vencimentoCiv: z.coerce.date().optional().nullable(),
    vencimentoCipp: z.coerce.date().optional().nullable(),
});