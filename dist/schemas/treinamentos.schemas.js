"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTreinamentoSchema = void 0;
const zod_1 = require("zod");
exports.createTreinamentoSchema = zod_1.z.object({
    userId: zod_1.z.string()
        .min(1, { message: "ID do usuário é obrigatório" })
        .uuid({ message: "ID de usuário inválido" }),
    nome: zod_1.z.string()
        .min(1, { message: "Nome do treinamento é obrigatório" })
        .min(2, { message: "Nome do treinamento muito curto" }),
    descricao: zod_1.z.string().optional().nullable(),
    dataRealizacao: zod_1.z.coerce.date(),
    dataVencimento: zod_1.z.coerce.date().optional().nullable(),
    comprovanteUrl: zod_1.z.string().url({ message: "URL inválida" }).optional().nullable(),
});
//# sourceMappingURL=treinamentos.schemas.js.map