"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.veiculoSchema = void 0;
const zod_1 = require("zod");
exports.veiculoSchema = zod_1.z.object({
    body: zod_1.z.object({
        placa: zod_1.z.string({ error: "Placa obrigatória" })
            .length(7, { error: "A placa deve ter 7 caracteres" })
            .transform(v => v.toUpperCase()),
        modelo: zod_1.z.string({ error: "Modelo obrigatório" }).min(2),
        ano: zod_1.z.coerce.number({ error: "Ano inválido" })
            .int()
            .min(1900, { error: "Ano inválido" })
            .max(new Date().getFullYear() + 1),
        tipoVeiculo: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        tipoCombustivel: zod_1.z.enum(['DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV'], {
            error: "Combustível inválido"
        }).default('DIESEL_S10'),
        capacidadeTanque: zod_1.z.coerce.number().positive().optional().nullable(),
        vencimentoCiv: zod_1.z.coerce.date().optional().nullable(),
        vencimentoCipp: zod_1.z.coerce.date().optional().nullable(),
    })
});
//# sourceMappingURL=veiculo.schemas.js.map