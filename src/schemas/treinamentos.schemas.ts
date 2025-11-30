import { z } from 'zod';

export const createTreinamentoSchema = z.object({
    userId: z.string()
        .min(1, { message: "ID do usuário é obrigatório" })
        .uuid({ message: "ID de usuário inválido" }),

    nome: z.string()
        .min(1, { message: "Nome do treinamento é obrigatório" })
        .min(2, { message: "Nome do treinamento muito curto" }),

    descricao: z.string().optional().nullable(),

    dataRealizacao: z.coerce.date(),

    dataVencimento: z.coerce.date().optional().nullable(),

    comprovanteUrl: z.string().url({ message: "URL inválida" }).optional().nullable(),
});