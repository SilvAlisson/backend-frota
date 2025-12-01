"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manutencaoSchema = exports.abastecimentoSchema = void 0;
const zod_1 = require("zod");
const itemSchema = zod_1.z.object({
    produtoId: zod_1.z.string().uuid({ error: "ID do produto inválido." }),
    quantidade: zod_1.z.number().positive({ error: "Quantidade deve ser maior que zero." }),
    valorPorUnidade: zod_1.z.number().min(0, { error: "Valor não pode ser negativo." }),
});
exports.abastecimentoSchema = zod_1.z.object({
    veiculoId: zod_1.z.string().uuid(),
    operadorId: zod_1.z.string().uuid(),
    fornecedorId: zod_1.z.string().uuid(),
    kmOdometro: zod_1.z.number().positive({ error: "KM inválido." }),
    dataHora: zod_1.z.coerce.date(),
    placaCartaoUsado: zod_1.z.string().optional().nullable(),
    justificativa: zod_1.z.string().optional().nullable(),
    observacoes: zod_1.z.string().optional().nullable(),
    fotoNotaFiscalUrl: zod_1.z.string().url({ error: "URL da foto inválida." }).optional().nullable(),
    itens: zod_1.z.array(itemSchema).min(1, { error: "O abastecimento deve ter pelo menos 1 item." }),
});
exports.manutencaoSchema = zod_1.z.object({
    veiculoId: zod_1.z.string().uuid(),
    fornecedorId: zod_1.z.string().uuid(),
    kmAtual: zod_1.z.number().positive(),
    data: zod_1.z.coerce.date(),
    tipo: zod_1.z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], { error: "Tipo de manutenção inválido" }),
    observacoes: zod_1.z.string().optional().nullable(),
    fotoComprovanteUrl: zod_1.z.string().url().optional().nullable(),
    itens: zod_1.z.array(itemSchema).min(1, { error: "A manutenção deve ter pelo menos 1 item." }),
});
//# sourceMappingURL=operacao.schemas.js.map