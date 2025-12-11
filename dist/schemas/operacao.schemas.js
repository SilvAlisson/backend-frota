"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manutencaoSchema = exports.abastecimentoSchema = void 0;
const zod_1 = require("zod");
const itemSchema = zod_1.z.object({
    produtoId: zod_1.z.string({ error: "Produto obrigatório" }).min(1),
    quantidade: zod_1.z.coerce.number({ error: "Qtd inválida" }).positive({ error: "Qtd deve ser > 0" }),
    valorPorUnidade: zod_1.z.coerce.number({ error: "Valor inválido" }).min(0),
});
// --- Abastecimento ---
exports.abastecimentoSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string({ error: "Veículo obrigatório" }).min(1),
        operadorId: zod_1.z.string({ error: "Operador obrigatório" }).min(1),
        fornecedorId: zod_1.z.string({ error: "Fornecedor obrigatório" }).min(1),
        kmOdometro: zod_1.z.coerce.number({ error: "KM inválido" }).positive(),
        dataHora: zod_1.z.coerce.date({ error: "Data inválida" }),
        placaCartaoUsado: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        justificativa: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        observacoes: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        // URL pode vir vazia se não tiver nota? Se for obrigatória:
        fotoNotaFiscalUrl: zod_1.z.string({ error: "URL da foto obrigatória" }).url().optional().nullable(),
        itens: zod_1.z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});
// --- Manutenção ---
exports.manutencaoSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Veículo é opcional em manutenção (ex: conserto de peça avulsa), mas se vier, é validado
        veiculoId: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        // KM atual também opcional se não tiver veículo
        kmAtual: zod_1.z.coerce.number().optional().nullable(),
        fornecedorId: zod_1.z.string({ error: "Fornecedor obrigatório" }).min(1),
        data: zod_1.z.coerce.date({ error: "Data inválida" }),
        tipo: zod_1.z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
            error: "Tipo inválido. Use: PREVENTIVA, CORRETIVA ou LAVAGEM"
        }),
        observacoes: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        fotoComprovanteUrl: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        itens: zod_1.z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});
//# sourceMappingURL=operacao.schemas.js.map