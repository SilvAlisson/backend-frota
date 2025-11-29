import { z } from 'zod';

// Item genérico (usado em ambos)
const itemSchema = z.object({
    produtoId: z.string().uuid("ID do produto inválido."),
    quantidade: z.number().positive("Quantidade deve ser maior que zero."),
    valorPorUnidade: z.number().min(0, "Valor não pode ser negativo."),
});

export const abastecimentoSchema = z.object({
    veiculoId: z.string().uuid(),
    operadorId: z.string().uuid(),
    fornecedorId: z.string().uuid(),
    kmOdometro: z.number().positive("KM inválido."),
    dataHora: z.coerce.date(), // Aceita string ISO e converte
    placaCartaoUsado: z.string().optional().nullable(),
    justificativa: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),
    fotoNotaFiscalUrl: z.string().url("URL da foto inválida.").optional().nullable(),

    itens: z.array(itemSchema).min(1, "O abastecimento deve ter pelo menos 1 item."),
});

export const manutencaoSchema = z.object({
    veiculoId: z.string().uuid(),
    fornecedorId: z.string().uuid(),
    kmAtual: z.number().positive(),
    data: z.coerce.date(),
    tipo: z.enum(['PREVENTIVA', 'CORRETIVA', 'LAVAGEM']),
    observacoes: z.string().optional().nullable(),
    fotoComprovanteUrl: z.string().url().optional().nullable(),

    itens: z.array(itemSchema).min(1, "A manutenção deve ter pelo menos 1 item."),
});