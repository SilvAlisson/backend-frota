import { z } from 'zod';

const itemSchema = z.object({
    produtoId: z.string().min(1, { error: "ID do produto inválido." }),
    quantidade: z.number().positive({ error: "Quantidade deve ser maior que zero." }),
    valorPorUnidade: z.number().min(0, { error: "Valor não pode ser negativo." }),
});

export const abastecimentoSchema = z.object({
    veiculoId: z.string().min(1, { error: "Veículo obrigatório" }),
    operadorId: z.string().min(1, { error: "Operador obrigatório" }),
    fornecedorId: z.string().min(1, { error: "Fornecedor obrigatório" }),

    kmOdometro: z.number().positive({ error: "KM inválido." }),
    dataHora: z.coerce.date(),

    placaCartaoUsado: z.string().optional().nullable(),
    justificativa: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),

    // z.url() é top-level no v4
    fotoNotaFiscalUrl: z.url({ error: "URL da foto inválida." }).optional().nullable(),

    itens: z.array(itemSchema).min(1, { error: "O abastecimento deve ter pelo menos 1 item." }),
});

export const manutencaoSchema = z.object({
    veiculoId: z.string().min(1, { error: "Veículo obrigatório" }),
    fornecedorId: z.string().min(1, { error: "Fornecedor obrigatório" }),

    kmAtual: z.number().positive(),
    data: z.coerce.date(),

    tipo: z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
        error: "Tipo de manutenção inválido"
    }),

    observacoes: z.string().optional().nullable(),
    fotoComprovanteUrl: z.url({ error: "URL inválida" }).optional().nullable(),

    itens: z.array(itemSchema).min(1, { error: "A manutenção deve ter pelo menos 1 item." }),
});