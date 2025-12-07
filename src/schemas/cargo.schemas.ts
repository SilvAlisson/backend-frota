import { z } from 'zod';

const requisitoSchema = z.object({
    nome: z.string({ error: "Nome do requisito obrigatório" }).min(2),
    validadeMeses: z.coerce.number({ error: "Validade inválida" }).min(0),
    diasAntecedenciaAlerta: z.coerce.number().min(1).default(30)
});

export const cargoSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" }).min(3, { error: "Mínimo 3 caracteres" }),

        descricao: z.string().optional().nullable().transform(v => v === "" ? null : v),

        requisitos: z.array(requisitoSchema).optional()
    })
});

export const addRequisitoSchema = z.object({
    body: requisitoSchema
});