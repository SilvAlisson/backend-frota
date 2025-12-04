"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importTreinamentosSchema = exports.createTreinamentoSchema = void 0;
const zod_1 = require("zod");
exports.createTreinamentoSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, { error: "ID do usuário é obrigatório" }),
    nome: zod_1.z.string().min(2, { error: "Nome do treinamento muito curto" }),
    descricao: zod_1.z.string().optional().nullable(),
    dataRealizacao: zod_1.z.coerce.date({ error: "Data inválida" }),
    dataVencimento: zod_1.z.coerce.date().optional().nullable(),
    comprovanteUrl: zod_1.z.string().optional().nullable(),
});
exports.importTreinamentosSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, { error: "ID do usuário é obrigatório" }),
    treinamentos: zod_1.z.array(zod_1.z.object({
        nome: zod_1.z.string().min(2, { error: "Nome inválido" }),
        descricao: zod_1.z.string().optional().nullable(),
        dataRealizacao: zod_1.z.coerce.date({ error: "Data inválida" }),
        dataVencimento: zod_1.z.coerce.date().optional().nullable(),
    })).min(1, { error: "A lista de importação não pode estar vazia" })
});
//# sourceMappingURL=treinamentos.schemas.js.map