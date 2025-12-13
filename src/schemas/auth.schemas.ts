import { z } from 'zod';

// --- LOGIN ---
export const loginSchema = z.object({
    body: z.object({
        // Isso valida formato e tipo string automaticamente.
        email: z.email({ error: "Email inválido" }),
        password: z.string({ error: "Senha obrigatória" }).min(1, { error: "Senha obrigatória" }),
    })
});

// --- REGISTER ---
export const registerUserSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" }).min(3, { error: "Mínimo 3 caracteres" }),

        email: z.email({ error: "Email inválido" }),

        password: z.string({ error: "Senha obrigatória" }).min(6, { error: "Senha muito curta" }),

        role: z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
            error: "Função inválida"
        }).optional().default('OPERADOR'),

        matricula: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cargoId: z.string().optional().nullable().transform(val => val === "" ? null : val),
        fotoUrl: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhNumero: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhCategoria: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhValidade: z.string().optional().nullable().transform(val => val === "" ? null : val),
        dataAdmissao: z.string().optional().nullable().transform(val => val === "" ? null : val),
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