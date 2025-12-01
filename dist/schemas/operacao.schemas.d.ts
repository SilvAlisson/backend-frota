import { z } from 'zod';
export declare const abastecimentoSchema: z.ZodObject<{
    veiculoId: z.ZodString;
    operadorId: z.ZodString;
    fornecedorId: z.ZodString;
    kmOdometro: z.ZodNumber;
    dataHora: z.ZodCoercedDate<unknown>;
    placaCartaoUsado: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    justificativa: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    observacoes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fotoNotaFiscalUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    itens: z.ZodArray<z.ZodObject<{
        produtoId: z.ZodString;
        quantidade: z.ZodNumber;
        valorPorUnidade: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const manutencaoSchema: z.ZodObject<{
    veiculoId: z.ZodString;
    fornecedorId: z.ZodString;
    kmAtual: z.ZodNumber;
    data: z.ZodCoercedDate<unknown>;
    tipo: z.ZodEnum<{
        PREVENTIVA: "PREVENTIVA";
        CORRETIVA: "CORRETIVA";
        LAVAGEM: "LAVAGEM";
    }>;
    observacoes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fotoComprovanteUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    itens: z.ZodArray<z.ZodObject<{
        produtoId: z.ZodString;
        quantidade: z.ZodNumber;
        valorPorUnidade: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=operacao.schemas.d.ts.map