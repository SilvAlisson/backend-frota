"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.veiculoSchema = void 0;
const zod_1 = require("zod");
exports.veiculoSchema = zod_1.z.object({
    body: zod_1.z.object({
        placa: zod_1.z.string({ error: "Placa obrigatória" })
            .length(7, { message: "A placa deve ter 7 caracteres" })
            .transform(v => v.toUpperCase()),
        modelo: zod_1.z.string({ error: "Modelo obrigatório" }).min(2, { message: "Modelo muito curto" }),
        marca: zod_1.z.string().optional().nullable().transform(v => v || null),
        ano: zod_1.z.coerce.number({ error: "Ano inválido" })
            .int()
            .min(1900, { message: "Ano inválido" })
            .max(new Date().getFullYear() + 1),
        tipoVeiculo: zod_1.z.string().optional().nullable().transform(v => v || null),
        tipoCombustivel: zod_1.z.enum(['DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV'], {
            error: "Combustível inválido"
        }).default('DIESEL_S10'),
        capacidadeTanque: zod_1.z.coerce.number().positive().optional().nullable(),
        status: zod_1.z.enum(['ATIVO', 'EM_MANUTENCAO', 'INATIVO']).optional().default('ATIVO'),
        vencimentoCiv: zod_1.z.coerce.date().optional().nullable(),
        vencimentoCipp: zod_1.z.coerce.date().optional().nullable(),
        kmCadastro: zod_1.z.coerce.number().optional().default(0),
    })
});
//# sourceMappingURL=veiculo.schemas.js.map