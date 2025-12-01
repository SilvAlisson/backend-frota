"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email({ error: "Email inválido" }),
    password: zod_1.z.string().min(6, { error: "A senha deve ter no mínimo 6 caracteres" }),
});
exports.registerUserSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, { error: "Nome deve ter no mínimo 3 caracteres" }),
    email: zod_1.z.string().email({ error: "Email inválido" }),
    password: zod_1.z.string().min(6, { error: "Senha muito curta" }),
    role: zod_1.z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR', 'RH', 'COORDENADOR'], {
        error: "Função inválida"
    }),
    matricula: zod_1.z.string().optional().nullable(),
    cnhNumero: zod_1.z.string().optional().nullable(),
    cnhCategoria: zod_1.z.string().optional().nullable(),
    cnhValidade: zod_1.z.string().datetime().optional().nullable(),
    dataAdmissao: zod_1.z.string().datetime().optional().nullable(),
});
//# sourceMappingURL=auth.schemas.js.map