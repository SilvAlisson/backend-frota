import { z } from 'zod';

// --- LOGIN ---
export const loginSchema = z.object({
    body: z.object({
        email: z.string({ error: "Email inválido" }).email({ message: "Formato de email inválido" }),
        password: z.string({ error: "Senha obrigatória" }).min(1, { message: "Senha obrigatória" }),
    })
});

// --- REGISTER ---
export const registerUserSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" }).min(3, { message: "Mínimo 3 caracteres" }),

        email: z.string({ error: "Email inválido" }).email({ message: "Email inválido" }),

        password: z.string({ error: "Senha obrigatória" }).min(6, { message: "Senha muito curta" }),

        role: z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
            error: "Função inválida"
        }).optional().default('OPERADOR'),

        matricula: z.string().optional().nullable().transform(v => v || null),
        cargoId: z.string().optional().nullable().transform(v => v || null),
        fotoUrl: z.string().optional().nullable().transform(v => v || null),

        cnhNumero: z.string().optional().nullable().transform(v => v || null),
        cnhCategoria: z.string().optional().nullable().transform(v => v || null),

        cnhValidade: z.coerce.date().optional().nullable(),
        dataAdmissao: z.coerce.date().optional().nullable(),
    })
});

export const loginWithTokenSchema = z.object({
    body: z.object({
        loginToken: z.string({ error: "Token obrigatório" })
    })
});

export const generateTokenSchema = z.object({
    params: z.object({
        id: z.string({ error: "ID do usuário necessário" })
    })
});