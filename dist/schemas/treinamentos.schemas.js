"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importTreinamentosSchema = exports.createTreinamentoSchema = void 0;
const zod_1 = require("zod");
const emptyToNull = (val) => (val === "" || val === undefined || val === null ? null : val);
const dateCoerce = zod_1.z.preprocess((val) => (val === "" ? null : val), zod_1.z.coerce.date().nullable().optional()).transform(val => val ?? null);
exports.createTreinamentoSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1),
        nome: zod_1.z.string().min(2),
        descricao: zod_1.z.string().optional().nullable().transform(val => emptyToNull(val)),
        dataRealizacao: zod_1.z.coerce.date(),
        dataVencimento: dateCoerce,
        comprovanteUrl: zod_1.z.string().optional().nullable().transform(val => emptyToNull(val)),
        requisitoId: zod_1.z.string().optional().nullable().transform(val => emptyToNull(val)),
    })
});
exports.importTreinamentosSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1),
        treinamentos: zod_1.z.array(zod_1.z.object({
            nome: zod_1.z.string().min(2),
            descricao: zod_1.z.string().optional().nullable().transform(val => emptyToNull(val)),
            dataRealizacao: zod_1.z.coerce.date(),
            dataVencimento: dateCoerce,
        })).min(1)
    })
});
//# sourceMappingURL=treinamentos.schemas.js.map