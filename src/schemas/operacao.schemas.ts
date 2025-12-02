import { z } from 'zod';

const itemSchema = z.object({
    produtoId: z.string().min(1, { error: "ID do produto inválido." }),

    quantidade: z.coerce.number().positive({ error: "Quantidade deve ser maior que zero." }),
    valorPorUnidade: z.coerce.number().min(0, { error: "Valor não pode ser negativo." }),
});

export const abastecimentoSchema = z.object({
    veiculoId: z.string().min(1, { error: "ID do veículo é obrigatório." }),
    operadorId: z.string().min(1, { error: "ID do operador é obrigatório." }),
    fornecedorId: z.string().min(1, { error: "ID do fornecedor é obrigatório." }),

    kmOdometro: z.coerce.number().positive({ error: "KM deve ser um valor positivo." }),

    dataHora: z.coerce.date({ error: "Data inválida." }),

    placaCartaoUsado: z.string().optional().nullable(),
    justificativa: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),

    fotoNotaFiscalUrl: z.url({ error: "URL da nota fiscal inválida." }),

    itens: z.array(itemSchema).min(1, { error: "O abastecimento deve ter pelo menos 1 item." }),
});

export const manutencaoSchema = z.object({
    veiculoId: z.string().optional().nullable(),
    kmAtual: z.coerce.number().optional().nullable(),

    fornecedorId: z.string().min(1, { error: "Fornecedor obrigatório" }),
    data: z.coerce.date(),

    tipo: z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], {
        error: "Tipo de manutenção inválido"
    }),

    observacoes: z.string().optional().nullable(),
    fotoComprovanteUrl: z.string().optional().nullable(),

    itens: z.array(itemSchema).min(1, { error: "A manutenção deve ter pelo menos 1 item." }),
});