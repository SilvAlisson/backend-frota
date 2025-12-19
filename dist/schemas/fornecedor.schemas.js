"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fornecedorSchema = void 0;
const zod_1 = require("zod");
const TipoFornecedorSchema = zod_1.z.enum(['POSTO', 'OFICINA', 'LAVA_JATO', 'SEGURADORA', 'OUTROS'], {
    error: "Tipo inválido"
});
exports.fornecedorSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string({ error: "Nome é obrigatório" }).min(2, { message: "Nome muito curto" }),
        tipo: TipoFornecedorSchema.optional().default('OUTROS'),
        cnpj: zod_1.z.string()
            .optional()
            .nullable()
            .refine((val) => !val || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(val), {
            message: "CNPJ inválido (00.000.000/0000-00)"
        })
            .transform(v => v || null),
    })
});
//# sourceMappingURL=fornecedor.schemas.js.map