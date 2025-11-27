"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Email inválido" }),
    password: zod_1.z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
});
exports.registerUserSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(['ADMIN', 'ENCARREGADO', 'OPERADOR']),
    matricula: zod_1.z.string().optional().nullable(),
});
//# sourceMappingURL=auth.schemas.js.map