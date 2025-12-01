"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fornecedorSchema = void 0;
const zod_1 = require("zod");
exports.fornecedorSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2, "Nome é obrigatório."),
    // Valida o formato: 00.000.000/0000-00
    cnpj: zod_1.z.string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato: 00.000.000/0000-00")
        .optional()
        .nullable(),
});
//# sourceMappingURL=fornecedor.schemas.js.map