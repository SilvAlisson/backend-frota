import { z } from 'zod';

export const veiculoSchema = z.object({
    body: z.object({
        placa: z.string({ error: "Placa obrigatória" })
            .length(7, { message: "A placa deve ter 7 caracteres" })
            .transform(v => v.toUpperCase()),

        modelo: z.string({ error: "Modelo obrigatório" })
            .min(2, { message: "Modelo muito curto" }),

        marca: z.string({ error: "Marca é obrigatória" })
            .min(2, { message: "Informe a marca correta" }),

        ano: z.coerce.number({ error: "Ano inválido" })
            .int()
            .min(1900, { message: "Ano inválido" })
            .max(new Date().getFullYear() + 1),

        tipoVeiculo: z.string().optional().nullable().transform(v => v || null),

        tipoCombustivel: z.enum(['DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV'], {
            error: "Combustível inválido"
        }).default('DIESEL_S10'),

        capacidadeTanque: z.coerce.number().positive().optional().nullable(),

        status: z.enum(['ATIVO', 'EM_MANUTENCAO', 'INATIVO']).optional().default('ATIVO'),

        vencimentoCiv: z.coerce.date().optional().nullable(),
        vencimentoCipp: z.coerce.date().optional().nullable(),

        kmAtual: z.coerce.number({ error: "KM inválido" }).optional().default(0),
    })
});