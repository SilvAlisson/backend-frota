import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.string({ error: "Email obrigatório" }).email({ error: "Email inválido" }),
        password: z.string({ error: "Senha obrigatória" }).min(6, { error: "Mínimo 6 caracteres" }),
    })
});

export const registerUserSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" }).min(3, { error: "Mínimo 3 caracteres" }),
        email: z.string({ error: "Email obrigatório" }).email({ error: "Email inválido" }),
        password: z.string({ error: "Senha obrigatória" }).min(6, { error: "Senha muito curta" }),

        role: z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
            error: "Função inválida"
        }).optional().default('OPERADOR'),

        matricula: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhNumero: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhCategoria: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhValidade: z.string().optional().nullable().transform(val => val === "" ? null : val),
        dataAdmissao: z.string().optional().nullable().transform(val => val === "" ? null : val),
    })
});