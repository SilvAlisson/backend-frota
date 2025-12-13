import { z } from 'zod';

const itemSchema = z.object({
    // V4: O parâmetro 'error' unifica required e invalid_type
    produtoId: z.string({ error: "Produto obrigatório" }).min(1, { error: "Produto obrigatório" }),

    // V4: z.coerce input agora é 'unknown', mas o funcionamento se mantém
    quantidade: z.coerce.number({ error: "Qtd inválida" })
        .positive({ error: "Qtd deve ser > 0" }),

    valorPorUnidade: z.coerce.number({ error: "Valor inválido" })
        .min(0, { error: "Valor não pode ser negativo" }),
});

// --- Abastecimento ---
export const abastecimentoSchema = z.object({
    body: z.object({
        veiculoId: z.string({ error: "Veículo obrigatório" }).min(1, { error: "Veículo obrigatório" }),
        operadorId: z.string({ error: "Operador obrigatório" }).min(1, { error: "Operador obrigatório" }),
        fornecedorId: z.string({ error: "Fornecedor obrigatório" }).min(1, { error: "Fornecedor obrigatório" }),

        kmOdometro: z.coerce.number({ error: "KM inválido" }).positive({ error: "KM deve ser positivo" }),
        dataHora: z.coerce.date({ error: "Data inválida" }),

        // Transforms mantidos (lógica de negócio não muda na v4)
        placaCartaoUsado: z.string().optional().nullable().transform(v => v === "" ? null : v),
        justificativa: z.string().optional().nullable().transform(v => v === "" ? null : v),
        observacoes: z.string().optional().nullable().transform(v => v === "" ? null : v),

        // MUDANÇA CRÍTICA V4: 
        // 1. 'required_error' removido -> use 'error'
        // 2. z.string().url() depreciado -> use z.url() (top-level)
        fotoNotaFiscalUrl: z.url({ error: "URL da foto inválida ou ausente" }),

        // Arrays mantêm a lógica, apenas ajustando a sintaxe de erro se necessário
        itens: z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});

// --- Manutenção ---
export const manutencaoSchema = z.object({
    body: z.object({
        veiculoId: z.string().optional().nullable().transform(v => v === "" ? null : v),
        kmAtual: z.coerce.number().optional().nullable(),
        fornecedorId: z.string({ error: "Fornecedor obrigatório" }).min(1, { error: "Fornecedor obrigatório" }),
        data: z.coerce.date({ error: "Data inválida" }),

        tipo: z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
            error: "Tipo inválido. Use: PREVENTIVA, CORRETIVA ou LAVAGEM"
        }),

        status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
            .optional()
            .default('CONCLUIDA'), // V4: .default() agora faz curto-circuito (retorna o default se undefined)

        observacoes: z.string().optional().nullable().transform(v => v === "" ? null : v),
        fotoComprovanteUrl: z.string().optional().nullable().transform(v => v === "" ? null : v),

        itens: z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});