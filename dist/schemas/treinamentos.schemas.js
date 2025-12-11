"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importTreinamentosSchema = exports.createTreinamentoSchema = void 0;
const zod_1 = require("zod");
exports.createTreinamentoSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string({ error: "Usuário obrigatório" }).min(1),
        nome: zod_1.z.string({ error: "Nome obrigatório" }).min(2),
        descricao: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        dataRealizacao: zod_1.z.coerce.date({ error: "Data Realização inválida" }),
        dataVencimento: zod_1.z.coerce.date().optional().nullable(),
        comprovanteUrl: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
    })
});
exports.importTreinamentosSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string({ error: "Usuário obrigatório" }).min(1),
        treinamentos: zod_1.z.array(zod_1.z.object({
            nome: zod_1.z.string().min(2),
            descricao: zod_1.z.string().optional().nullable(),
            dataRealizacao: zod_1.z.coerce.date(),
            dataVencimento: zod_1.z.coerce.date().optional().nullable(),
        })).min(1)
    })
});
//# sourceMappingURL=treinamentos.schemas.js.map