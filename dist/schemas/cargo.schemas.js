"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequisitoSchema = exports.cargoSchema = void 0;
const zod_1 = require("zod");
const requisitoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2, "Nome do treinamento é obrigatório"),
    validadeMeses: zod_1.z.number().min(0, "Validade inválida"),
    diasAntecedenciaAlerta: zod_1.z.number().min(1).default(30)
});
exports.cargoSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, { message: "Nome do cargo deve ter no mínimo 3 caracteres" }),
    descricao: zod_1.z.string().optional().nullable(),
    requisitos: zod_1.z.array(requisitoSchema).optional()
});
exports.addRequisitoSchema = requisitoSchema;
//# sourceMappingURL=cargo.schemas.js.map