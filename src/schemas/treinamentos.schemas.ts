import { z } from 'zod';

const emptyToNull = (val: unknown) => (val === "" ? null : val);
const dateCoerce = z.preprocess(emptyToNull, z.coerce.date().nullable().optional());

export const createTreinamentoSchema = z.object({
    body: z.object({
        userId: z.string().min(1),
        nome: z.string().min(2),

        descricao: z.string().optional().nullable().transform(emptyToNull),

        dataRealizacao: z.coerce.date(),
        dataVencimento: dateCoerce,

        comprovanteUrl: z.string().optional().nullable().transform(emptyToNull),

        // Campo opcional caso seja um registro vinculado a um requisito
        requisitoId: z.string().optional().nullable().transform(emptyToNull),
    })
});

// Schema específico para o endpoint de registro de requisito (TreinamentoController)
export const registroTreinamentoSchema = z.object({
    body: z.object({
        userId: z.string().cuid(),
        requisitoId: z.string().cuid(),
        dataConclusao: z.coerce.date(),
        certificadoUrl: z.string().optional().nullable().transform(emptyToNull),
        observacoes: z.string().optional().nullable().transform(emptyToNull)
    })
});

export const importTreinamentosSchema = z.object({
    body: z.object({
        userId: z.string().min(1),
        treinamentos: z.array(z.object({
            nome: z.string().min(2),
            descricao: z.string().optional().nullable(),
            dataRealizacao: z.coerce.date(),
            dataVencimento: dateCoerce,
        })).min(1)
    })
});