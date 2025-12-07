import { z } from 'zod';

const itemSchema = z.object({
    produtoId: z.string({ error: "Produto obrigatório" }).min(1),

    quantidade: z.coerce.number({ error: "Qtd inválida" }).positive({ error: "> 0" }),
    valorPorUnidade: z.coerce.number({ error: "Valor inválido" }).min(0),
});

export const abastecimentoSchema = z.object({
    body: z.object({
        veiculoId: z.string({ error: "Veículo obrigatório" }).min(1),
        operadorId: z.string({ error: "Operador obrigatório" }).min(1),
        fornecedorId: z.string({ error: "Fornecedor obrigatório" }).min(1),

        kmOdometro: z.coerce.number({ error: "KM inválido" }).positive(),
        dataHora: z.coerce.date({ error: "Data inválida" }),

        placaCartaoUsado: z.string().optional().nullable().transform(v => v === "" ? null : v),
        justificativa: z.string().optional().nullable().transform(v => v === "" ? null : v),
        observacoes: z.string().optional().nullable().transform(v => v === "" ? null : v),

        fotoNotaFiscalUrl: z.string({ error: "URL da foto obrigatória" }).url().optional().nullable(),

        itens: z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});

export const manutencaoSchema = z.object({
    body: z.object({
        veiculoId: z.string().optional().nullable(),
        kmAtual: z.coerce.number().optional().nullable(),

        fornecedorId: z.string({ error: "Fornecedor obrigatório" }).min(1),
        data: z.coerce.date({ error: "Data inválida" }),

        tipo: z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM'], { error: "Tipo inválido" }),

        observacoes: z.string().optional().nullable().transform(v => v === "" ? null : v),
        fotoComprovanteUrl: z.string().optional().nullable().transform(v => v === "" ? null : v),

        itens: z.array(itemSchema).min(1, { error: "Mínimo 1 item" }),
    })
});