import { z } from 'zod';

const requisitoSchema = z.object({
    nome: z.string().min(2, { error: "Nome do treinamento é obrigatório" }),
    validadeMeses: z.number().min(0, { error: "Validade inválida" }),
    diasAntecedenciaAlerta: z.number().min(1).default(30)
});

export const cargoSchema = z.object({
    nome: z.string().min(3, { error: "Nome do cargo deve ter no mínimo 3 caracteres" }),
    descricao: z.string().optional().nullable(),

    requisitos: z.array(requisitoSchema).optional()
});

export const addRequisitoSchema = requisitoSchema;