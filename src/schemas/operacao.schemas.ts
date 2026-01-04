import { z } from 'zod';

const itemSchema = z.object({
    produtoId: z.string({ error: "Produto obrigatório" }).min(1, { message: "Produto obrigatório" }),

    quantidade: z.coerce.number({ error: "Qtd inválida" })
        .positive({ message: "Qtd deve ser > 0" }),

    valorPorUnidade: z.coerce.number({ error: "Valor inválido" })
        .min(0, { message: "Valor não pode ser negativo" }),
});

// --- Abastecimento ---
export const abastecimentoSchema = z.object({
    body: z.object({
        veiculoId: z.string({ error: "Veículo obrigatório" }).min(1, { message: "Veículo obrigatório" }),
        operadorId: z.string({ error: "Operador obrigatório" }).min(1, { message: "Operador obrigatório" }),
        fornecedorId: z.string({ error: "Fornecedor obrigatório" }).min(1, { message: "Fornecedor obrigatório" }),

        kmOdometro: z.coerce.number({ error: "KM inválido" }).positive({ message: "KM deve ser positivo" }),
        dataHora: z.coerce.date({ error: "Data inválida" }),

        // Transformações seguras para o Prisma (string | null)
        placaCartaoUsado: z.string().optional().nullable().transform(v => v || null),
        justificativa: z.string().optional().nullable().transform(v => v || null),
        observacoes: z.string().optional().nullable().transform(v => v || null),

        // Validação de URL: Aceita string (que será validada como URL) ou null/undefined se vazio
        fotoNotaFiscalUrl: z.string().url({ message: "URL da foto inválida" })
            .optional()
            .nullable()
            .or(z.literal(''))
            .transform(v => v || null),

        itens: z.array(itemSchema).min(1, { message: "Adicione pelo menos um item" }),
    })
});

// --- Manutenção ---
export const manutencaoSchema = z.object({
    body: z.object({
        veiculoId: z.string().optional().nullable().transform(v => v || null),
        kmAtual: z.coerce.number().optional().nullable(),
        fornecedorId: z.string({ error: "Fornecedor obrigatório" }).min(1, { message: "Fornecedor obrigatório" }),
        data: z.coerce.date({ error: "Data inválida" }),

        tipo: z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
            error: "Tipo inválido"
        }),

        status: z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
            .optional()
            .default('CONCLUIDA'),

        observacoes: z.string().optional().nullable().transform(v => v || null),
        fotoComprovanteUrl: z.string().optional().nullable().transform(v => v || null),

        itens: z.array(itemSchema).min(1, { message: "Adicione pelo menos um item" }),
    })
});