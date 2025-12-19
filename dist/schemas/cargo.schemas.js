"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRequisitoSchema = exports.cargoSchema = void 0;
const zod_1 = require("zod");
const requisitoSchema = zod_1.z.object({
    nome: zod_1.z.string({ error: "Nome do requisito obrigatório" }).min(2, { message: "Nome muito curto" }),
    validadeMeses: zod_1.z.coerce.number({ error: "Validade inválida" }).min(0),
    diasAntecedenciaAlerta: zod_1.z.coerce.number().min(1).default(30)
});
exports.cargoSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string({ error: "Nome obrigatório" }).min(3, { message: "Mínimo 3 caracteres" }),
        descricao: zod_1.z.string().optional().nullable().transform(v => v || null),
        requisitos: zod_1.z.array(requisitoSchema).optional()
    })
});
exports.addRequisitoSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ error: "ID do cargo inválido" })
    }),
    body: requisitoSchema
});
//# sourceMappingURL=cargo.schemas.js.map