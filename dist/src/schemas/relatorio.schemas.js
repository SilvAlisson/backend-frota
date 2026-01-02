"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relatorioQuerySchema = void 0;
const zod_1 = require("zod");
exports.relatorioQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        ano: zod_1.z.coerce.number({ error: "Ano inválido" })
            .int()
            .min(2000, { message: "Ano mínimo 2000" })
            .max(2100)
            .optional(),
        mes: zod_1.z.coerce.number({ error: "Mês inválido" })
            .int()
            .min(1, { message: "Mês inválido (1-12)" })
            .max(12, { message: "Mês inválido (1-12)" })
            .optional(),
        veiculoId: zod_1.z.string().optional()
    })
});
//# sourceMappingURL=relatorio.schemas.js.map