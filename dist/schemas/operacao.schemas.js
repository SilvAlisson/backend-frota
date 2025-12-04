"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manutencaoSchema = exports.abastecimentoSchema = void 0;
const zod_1 = require("zod");
const itemSchema = zod_1.z.object({
    produtoId: zod_1.z.string().min(1, { error: "ID do produto inválido." }),
    quantidade: zod_1.z.coerce.number().positive({ error: "Quantidade deve ser maior que zero." }),
    valorPorUnidade: zod_1.z.coerce.number().min(0, { error: "Valor não pode ser negativo." }),
});
exports.abastecimentoSchema = zod_1.z.object({
    veiculoId: zod_1.z.string().min(1, { error: "ID do veículo é obrigatório." }),
    operadorId: zod_1.z.string().min(1, { error: "ID do operador é obrigatório." }),
    fornecedorId: zod_1.z.string().min(1, { error: "ID do fornecedor é obrigatório." }),
    kmOdometro: zod_1.z.coerce.number().positive({ error: "KM deve ser um valor positivo." }),
    dataHora: zod_1.z.coerce.date({ error: "Data inválida." }),
    placaCartaoUsado: zod_1.z.string().optional().nullable(),
    justificativa: zod_1.z.string().optional().nullable(),
    observacoes: zod_1.z.string().optional().nullable(),
    fotoNotaFiscalUrl: zod_1.z.url({ error: "URL da nota fiscal inválida." }),
    itens: zod_1.z.array(itemSchema).min(1, { error: "O abastecimento deve ter pelo menos 1 item." }),
});
exports.manutencaoSchema = zod_1.z.object({
    veiculoId: zod_1.z.string().optional().nullable(),
    kmAtual: zod_1.z.coerce.number().optional().nullable(),
    fornecedorId: zod_1.z.string().min(1, { error: "Fornecedor obrigatório" }),
    data: zod_1.z.coerce.date(),
    tipo: zod_1.z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
        error: "Tipo de manutenção inválido"
    }),
    observacoes: zod_1.z.string().optional().nullable(),
    fotoComprovanteUrl: zod_1.z.string().optional().nullable(),
    itens: zod_1.z.array(itemSchema).min(1, { error: "A manutenção deve ter pelo menos 1 item." }),
});
//# sourceMappingURL=operacao.schemas.js.map