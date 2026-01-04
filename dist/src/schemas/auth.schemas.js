"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenSchema = exports.loginWithTokenSchema = exports.registerUserSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// --- LOGIN ---
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string({ error: "Email inválido" }).email({ message: "Formato de email inválido" }),
        password: zod_1.z.string({ error: "Senha obrigatória" }).min(1, { message: "Senha obrigatória" }),
    })
});
// --- REGISTER ---
exports.registerUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string({ error: "Nome obrigatório" }).min(3, { message: "Mínimo 3 caracteres" }),
        email: zod_1.z.string({ error: "Email inválido" }).email({ message: "Email inválido" }),
        password: zod_1.z.string({ error: "Senha obrigatória" }).min(6, { message: "Senha muito curta" }),
        role: zod_1.z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
            error: "Função inválida"
        }).optional().default('OPERADOR'),
        matricula: zod_1.z.string().optional().nullable().transform(v => v || null),
        cargoId: zod_1.z.string().optional().nullable().transform(v => v || null),
        fotoUrl: zod_1.z.string().optional().nullable().transform(v => v || null),
        cnhNumero: zod_1.z.string().optional().nullable().transform(v => v || null),
        cnhCategoria: zod_1.z.string().optional().nullable().transform(v => v || null),
        cnhValidade: zod_1.z.coerce.date().optional().nullable(),
        dataAdmissao: zod_1.z.coerce.date().optional().nullable(),
    })
});
exports.loginWithTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        loginToken: zod_1.z.string({ error: "Token obrigatório" })
    })
});
exports.generateTokenSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ error: "ID do usuário necessário" })
    })
});
//# sourceMappingURL=auth.schemas.js.map