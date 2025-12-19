import { z } from 'zod';

const emptyToNull = (val: string | null | undefined): string | null =>
    (val === "" || val === undefined || val === null ? null : val);

const dateCoerce = z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.date().nullable().optional()
).transform(val => val ?? null);

export const createTreinamentoSchema = z.object({
    body: z.object({
        userId: z.string().min(1),
        nome: z.string().min(2),
        descricao: z.string().optional().nullable().transform(val => emptyToNull(val)),
        dataRealizacao: z.coerce.date(),
        dataVencimento: dateCoerce,
        comprovanteUrl: z.string().optional().nullable().transform(val => emptyToNull(val)),
        requisitoId: z.string().optional().nullable().transform(val => emptyToNull(val)),
    })
});

export const importTreinamentosSchema = z.object({
    body: z.object({
        userId: z.string().min(1),
        treinamentos: z.array(z.object({
            nome: z.string().min(2),
            descricao: z.string().optional().nullable().transform(val => emptyToNull(val)),
            dataRealizacao: z.coerce.date(),
            dataVencimento: dateCoerce,
        })).min(1)
    })
});