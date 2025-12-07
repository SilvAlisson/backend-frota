import { z } from 'zod';

// --- LOGIN ---
export const loginSchema = z.object({
    body: z.object({
        email: z.string({ error: "Email obrigatório" }).email({ error: "Email inválido" }),
        password: z.string({ error: "Senha obrigatória" }).min(1, { error: "Senha obrigatória" }),
    })
});

// --- REGISTER (Atualizado com cargoId e fotoUrl) ---
export const registerUserSchema = z.object({
    body: z.object({
        nome: z.string({ error: "Nome obrigatório" }).min(3, { error: "Mínimo 3 caracteres" }),
        email: z.string({ error: "Email obrigatório" }).email({ error: "Email inválido" }),
        password: z.string({ error: "Senha obrigatória" }).min(6, { error: "Senha muito curta" }),

        role: z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
            error: "Função inválida"
        }).optional().default('OPERADOR'),

        // Campos opcionais com tratamento de string vazia -> null
        matricula: z.string().optional().nullable().transform(val => val === "" ? null : val),

        // Cargo ID (UUID do cargo)
        cargoId: z.string().optional().nullable().transform(val => val === "" ? null : val),

        //  Foto URL
        fotoUrl: z.string().optional().nullable().transform(val => val === "" ? null : val),

        cnhNumero: z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhCategoria: z.string().optional().nullable().transform(val => val === "" ? null : val),

        // Datas vêm como string do JSON
        cnhValidade: z.string().optional().nullable().transform(val => val === "" ? null : val),
        dataAdmissao: z.string().optional().nullable().transform(val => val === "" ? null : val),
    })
});

// --- NOVOS SCHEMAS ---
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