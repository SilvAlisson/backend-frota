"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fornecedorSchema = void 0;
const zod_1 = require("zod");
const TipoFornecedorSchema = zod_1.z.enum(['POSTO', 'OFICINA', 'LAVA_JATO', 'SEGURADORA', 'OUTROS'], {
    error: "Tipo inválido"
});
exports.fornecedorSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string({ error: "Nome é obrigatório" }).min(2),
        tipo: TipoFornecedorSchema.optional().default('OUTROS'),
        cnpj: zod_1.z.union([
            zod_1.z.string().length(0),
            zod_1.z.null(),
            zod_1.z.undefined(),
            zod_1.z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido" })
        ]).optional().transform(e => e === "" ? null : e),
    })
});
//# sourceMappingURL=fornecedor.schemas.js.map