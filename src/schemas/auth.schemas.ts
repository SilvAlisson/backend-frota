import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email({ message: "Email inválido" }),
    password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
});

export const registerUserSchema = z.object({
    nome: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR']),

    matricula: z.string().optional().nullable(),

    cnhNumero: z.string().optional().nullable(),
    cnhCategoria: z.string().optional().nullable(),
    cnhValidade: z.string().datetime().optional().nullable(),
    dataAdmissao: z.string().datetime().optional().nullable(),
});