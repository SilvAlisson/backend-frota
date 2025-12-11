"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenSchema = exports.loginWithTokenSchema = exports.registerUserSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// --- LOGIN ---
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string({ error: "Email obrigatório" }).email({ error: "Email inválido" }),
        password: zod_1.z.string({ error: "Senha obrigatória" }).min(1, { error: "Senha obrigatória" }),
    })
});
// --- REGISTER (Atualizado com cargoId e fotoUrl) ---
exports.registerUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string({ error: "Nome obrigatório" }).min(3, { error: "Mínimo 3 caracteres" }),
        email: zod_1.z.string({ error: "Email obrigatório" }).email({ error: "Email inválido" }),
        password: zod_1.z.string({ error: "Senha obrigatória" }).min(6, { error: "Senha muito curta" }),
        role: zod_1.z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
            error: "Função inválida"
        }).optional().default('OPERADOR'),
        // Campos opcionais com tratamento de string vazia -> null
        matricula: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
        // Cargo ID (UUID do cargo)
        cargoId: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
        //  Foto URL
        fotoUrl: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhNumero: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
        cnhCategoria: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
        // Datas vêm como string do JSON
        cnhValidade: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
        dataAdmissao: zod_1.z.string().optional().nullable().transform(val => val === "" ? null : val),
    })
});
// --- NOVOS SCHEMAS ---
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