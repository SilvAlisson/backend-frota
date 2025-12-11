"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.produtoSchema = void 0;
const zod_1 = require("zod");
exports.produtoSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string({ error: "Nome obrigatório" })
            .min(2, { error: "Muito curto" })
            .transform(v => v.toUpperCase()),
        tipo: zod_1.z.enum(['COMBUSTIVEL', 'ADITIVO', 'LAVAGEM', 'PECA', 'SERVICO', 'OUTRO'], {
            error: "Tipo de produto inválido"
        }),
        unidadeMedida: zod_1.z.string().default('Litro'),
    })
});
//# sourceMappingURL=produto.schemas.js.map