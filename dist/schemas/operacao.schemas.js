"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manutencaoSchema = exports.abastecimentoSchema = void 0;
const zod_1 = require("zod");
const itemSchema = zod_1.z.object({
    // V4: O parâmetro 'error' unifica required e invalid_type
    produtoId: zod_1.z.string({ error: "Produto obrigatório" }).min(1, { error: "Produto obrigatório" }),
    // V4: z.coerce input agora é 'unknown', mas o funcionamento se mantém
    quantidade: zod_1.z.coerce.number({ error: "Qtd inválida" })
        .positive({ error: "Qtd deve ser > 0" }),
    valorPorUnidade: zod_1.z.coerce.number({ error: "Valor inválido" })
        .min(0, { error: "Valor não pode ser negativo" }),
});
// --- Abastecimento ---
exports.abastecimentoSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string({ error: "Veículo obrigatório" }).min(1, { error: "Veículo obrigatório" }),
        operadorId: zod_1.z.string({ error: "Operador obrigatório" }).min(1, { error: "Operador obrigatório" }),
        fornecedorId: zod_1.z.string({ error: "Fornecedor obrigatório" }).min(1, { error: "Fornecedor obrigatório" }),
        kmOdometro: zod_1.z.coerce.number({ error: "KM inválido" }).positive({ error: "KM deve ser positivo" }),
        dataHora: zod_1.z.coerce.date({ error: "Data inválida" }),
        // Transforms mantidos (lógica de negócio não muda na v4)
        placaCartaoUsado: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        justificativa: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        observacoes: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        // MUDANÇA CRÍTICA V4: 
        // 1. 'required_error' removido -> use 'error'
        // 2. z.string().url() depreciado -> use z.url() (top-level)
        fotoNotaFiscalUrl: zod_1.z.url({ error: "URL da foto inválida ou ausente" }),
        // Arrays mantêm a lógica, apenas ajustando a sintaxe de erro se necessário
        itens: zod_1.z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});
// --- Manutenção ---
exports.manutencaoSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        kmAtual: zod_1.z.coerce.number().optional().nullable(),
        fornecedorId: zod_1.z.string({ error: "Fornecedor obrigatório" }).min(1, { error: "Fornecedor obrigatório" }),
        data: zod_1.z.coerce.date({ error: "Data inválida" }),
        tipo: zod_1.z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
            error: "Tipo inválido. Use: PREVENTIVA, CORRETIVA ou LAVAGEM"
        }),
        status: zod_1.z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
            .optional()
            .default('CONCLUIDA'), // V4: .default() agora faz curto-circuito (retorna o default se undefined)
        observacoes: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        fotoComprovanteUrl: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
        itens: zod_1.z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});
//# sourceMappingURL=operacao.schemas.js.map