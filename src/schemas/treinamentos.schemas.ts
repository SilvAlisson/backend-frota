import { z } from 'zod';

export const createTreinamentoSchema = z.object({
    body: z.object({
        userId: z.string({ error: "Usuário obrigatório" }).min(1),
        nome: z.string({ error: "Nome obrigatório" }).min(2),

        descricao: z.string().optional().nullable().transform(v => v === "" ? null : v),

        dataRealizacao: z.coerce.date({ error: "Data Realização inválida" }),
        dataVencimento: z.coerce.date().optional().nullable(),

        comprovanteUrl: z.string().optional().nullable().transform(v => v === "" ? null : v),
    })
});

export const importTreinamentosSchema = z.object({
    body: z.object({
        userId: z.string({ error: "Usuário obrigatório" }).min(1),

        treinamentos: z.array(z.object({
            nome: z.string().min(2),
            descricao: z.string().optional().nullable(),
            dataRealizacao: z.coerce.date(),
            dataVencimento: z.coerce.date().optional().nullable(),
        })).min(1)
    })
});