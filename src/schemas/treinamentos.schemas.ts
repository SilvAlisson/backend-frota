import { z } from 'zod';

export const createTreinamentoSchema = z.object({
    userId: z.string().min(1, { error: "ID do usuário é obrigatório" }),

    nome: z.string().min(2, { error: "Nome do treinamento muito curto" }),

    descricao: z.string().optional().nullable(),

    dataRealizacao: z.coerce.date({ error: "Data inválida" }),
    dataVencimento: z.coerce.date().optional().nullable(),

    comprovanteUrl: z.string().optional().nullable(),
});

export const importTreinamentosSchema = z.object({
    userId: z.string().min(1, { error: "ID do usuário é obrigatório" }),

    treinamentos: z.array(z.object({
        nome: z.string().min(2, { error: "Nome inválido" }),
        descricao: z.string().optional().nullable(),
        dataRealizacao: z.coerce.date({ error: "Data inválida" }),
        dataVencimento: z.coerce.date().optional().nullable(),
    })).min(1, { error: "A lista de importação não pode estar vazia" })
});