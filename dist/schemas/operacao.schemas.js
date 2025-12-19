"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manutencaoSchema = exports.abastecimentoSchema = void 0;
const zod_1 = require("zod");
const itemSchema = zod_1.z.object({
    produtoId: zod_1.z.string({ error: "Produto obrigatório" }).min(1, { message: "Produto obrigatório" }),
    quantidade: zod_1.z.coerce.number({ error: "Qtd inválida" })
        .positive({ message: "Qtd deve ser > 0" }),
    valorPorUnidade: zod_1.z.coerce.number({ error: "Valor inválido" })
        .min(0, { message: "Valor não pode ser negativo" }),
});
// --- Abastecimento ---
exports.abastecimentoSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string({ error: "Veículo obrigatório" }).min(1, { message: "Veículo obrigatório" }),
        operadorId: zod_1.z.string({ error: "Operador obrigatório" }).min(1, { message: "Operador obrigatório" }),
        fornecedorId: zod_1.z.string({ error: "Fornecedor obrigatório" }).min(1, { message: "Fornecedor obrigatório" }),
        kmOdometro: zod_1.z.coerce.number({ error: "KM inválido" }).positive({ message: "KM deve ser positivo" }),
        dataHora: zod_1.z.coerce.date({ error: "Data inválida" }),
        // Transformações seguras para o Prisma (string | null)
        placaCartaoUsado: zod_1.z.string().optional().nullable().transform(v => v || null),
        justificativa: zod_1.z.string().optional().nullable().transform(v => v || null),
        observacoes: zod_1.z.string().optional().nullable().transform(v => v || null),
        // Validação de URL corrigida: Aceita string (que será validada como URL) ou null/undefined se vazio
        fotoNotaFiscalUrl: zod_1.z.string().url({ message: "URL da foto inválida" })
            .optional()
            .nullable()
            .or(zod_1.z.literal('')) // Aceita string vazia vinda do front
            .transform(v => v || null),
        itens: zod_1.z.array(itemSchema).min(1, { message: "Adicione pelo menos um item" }),
    })
});
// --- Manutenção ---
exports.manutencaoSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string().optional().nullable().transform(v => v || null),
        kmAtual: zod_1.z.coerce.number().optional().nullable(),
        fornecedorId: zod_1.z.string({ error: "Fornecedor obrigatório" }).min(1, { message: "Fornecedor obrigatório" }),
        data: zod_1.z.coerce.date({ error: "Data inválida" }),
        tipo: zod_1.z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
            error: "Tipo inválido"
        }),
        status: zod_1.z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
            .optional()
            .default('CONCLUIDA'),
        observacoes: zod_1.z.string().optional().nullable().transform(v => v || null),
        fotoComprovanteUrl: zod_1.z.string().optional().nullable().transform(v => v || null),
        itens: zod_1.z.array(itemSchema).min(1, { message: "Adicione pelo menos um item" }),
    })
});
//# sourceMappingURL=operacao.schemas.js.map