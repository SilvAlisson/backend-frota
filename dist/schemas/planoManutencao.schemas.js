"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planoManutencaoSchema = void 0;
const zod_1 = require("zod");
exports.planoManutencaoSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string({ error: "Veículo é obrigatório" })
            .min(1, { message: "Veículo é obrigatório" }),
        descricao: zod_1.z.string({ error: "Descrição é obrigatória" })
            .min(3, { message: "Descrição muito curta" }),
        tipoIntervalo: zod_1.z.enum(['KM', 'TEMPO'], {
            error: "Tipo de intervalo inválido. Use 'KM' ou 'TEMPO'."
        }),
        valorIntervalo: zod_1.z.coerce.number({ error: "Valor do intervalo inválido" })
            .positive({ message: "O intervalo deve ser positivo" })
    })
});
//# sourceMappingURL=planoManutencao.schemas.js.map