import { z } from 'zod';
export declare const abastecimentoSchema: z.ZodObject<{
    body: z.ZodObject<{
        veiculoId: z.ZodString;
        operadorId: z.ZodString;
        fornecedorId: z.ZodString;
        kmOdometro: z.ZodCoercedNumber<unknown>;
        dataHora: z.ZodCoercedDate<unknown>;
        placaCartaoUsado: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        justificativa: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        observacoes: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        fotoNotaFiscalUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        itens: z.ZodArray<z.ZodObject<{
            produtoId: z.ZodString;
            quantidade: z.ZodCoercedNumber<unknown>;
            valorPorUnidade: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const manutencaoSchema: z.ZodObject<{
    body: z.ZodObject<{
        veiculoId: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        kmAtual: z.ZodNullable<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        fornecedorId: z.ZodString;
        data: z.ZodCoercedDate<unknown>;
        tipo: z.ZodEnum<{
            PREVENTIVA: "PREVENTIVA";
            CORRETIVA: "CORRETIVA";
            LAVAGEM: "LAVAGEM";
        }>;
        observacoes: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        fotoComprovanteUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        itens: z.ZodArray<z.ZodObject<{
            produtoId: z.ZodString;
            quantidade: z.ZodCoercedNumber<unknown>;
            valorPorUnidade: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=operacao.schemas.d.ts.map