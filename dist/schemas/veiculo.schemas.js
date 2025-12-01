"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.veiculoSchema = void 0;
const zod_1 = require("zod");
exports.veiculoSchema = zod_1.z.object({
    placa: zod_1.z.string()
        .length(7, { error: "A placa deve ter exatamente 7 caracteres." })
        .transform(v => v.toUpperCase()),
    modelo: zod_1.z.string().min(2, { error: "Modelo deve ter pelo menos 2 caracteres." }),
    ano: zod_1.z.number({ error: "Ano é obrigatório e deve ser numérico." })
        .int()
        .min(1900, { error: "Ano inválido." })
        .max(new Date().getFullYear() + 1, { error: "Ano não pode ser futuro." }),
    tipoVeiculo: zod_1.z.string().optional().nullable(),
    tipoCombustivel: zod_1.z.enum(['DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV'], {
        error: "Tipo de combustível inválido"
    }).default('DIESEL_S10'),
    capacidadeTanque: zod_1.z.number().positive().optional().nullable(),
    vencimentoCiv: zod_1.z.coerce.date().optional().nullable(),
    vencimentoCipp: zod_1.z.coerce.date().optional().nullable(),
});
//# sourceMappingURL=veiculo.schemas.js.map