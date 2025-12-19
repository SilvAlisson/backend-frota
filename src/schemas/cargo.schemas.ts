import { z } from 'zod';

const requisitoSchema = z.object({
    nome: z.string({ error: "Nome do requisito obrigatório" }).min(2, { message: "Nome muito curto" }),

    validadeMeses: z.coerce.number({ error: "Validade inválida" }).min(0),

    diasAntecedenciaAlerta: z.coerce.number().min(1).default(30)
});

export const cargoSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" }).min(3, { message: "Mínimo 3 caracteres" }),

        descricao: z.string().optional().nullable().transform(v => v || null),

        requisitos: z.array(requisitoSchema).optional()
    })
});

export const addRequisitoSchema = z.object({
    params: z.object({
        id: z.string({ error: "ID do cargo inválido" })
    }),
    body: requisitoSchema
});