import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email({ error: "Email inválido" }),
    password: z.string().min(6, { error: "A senha deve ter no mínimo 6 caracteres" }),
});

export const registerUserSchema = z.object({
    nome: z.string().min(3, { error: "Nome deve ter no mínimo 3 caracteres" }),
    email: z.string().email({ error: "Email inválido" }),
    password: z.string().min(6, { error: "Senha muito curta" }),
    role: z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
        error: "Função inválida"
    }),

    matricula: z.string().optional().nullable(),

    cnhNumero: z.string().optional().nullable(),
    cnhCategoria: z.string().optional().nullable(),
    cnhValidade: z.string().datetime().optional().nullable(),
    dataAdmissao: z.string().datetime().optional().nullable(),
});