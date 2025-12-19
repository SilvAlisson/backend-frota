import { z } from 'zod';
export declare const abastecimentoSchema: z.ZodObject<{
    body: z.ZodObject<{
        veiculoId: z.ZodString;
        operadorId: z.ZodString;
        fornecedorId: z.ZodString;
        kmOdometro: z.ZodCoercedNumber<unknown>;
        dataHora: z.ZodCoercedDate<unknown>;
        placaCartaoUsado: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        justificativa: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        observacoes: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        fotoNotaFiscalUrl: z.ZodPipe<z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>, z.ZodTransform<string | null, string | null | undefined>>;
        itens: z.ZodArray<z.ZodObject<{
            produtoId: z.ZodString;
            quantidade: z.ZodCoercedNumber<unknown>;
            valorPorUnidade: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const manutencaoSchema: z.ZodObject<{
    body: z.ZodObject<{
        veiculoId: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        kmAtual: z.ZodNullable<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        fornecedorId: z.ZodString;
        data: z.ZodCoercedDate<unknown>;
        tipo: z.ZodEnum<{
            PREVENTIVA: "PREVENTIVA";
            CORRETIVA: "CORRETIVA";
            LAVAGEM: "LAVAGEM";
        }>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            PENDENTE: "PENDENTE";
            EM_ANDAMENTO: "EM_ANDAMENTO";
            CONCLUIDA: "CONCLUIDA";
            CANCELADA: "CANCELADA";
        }>>>;
        observacoes: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        fotoComprovanteUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        itens: z.ZodArray<z.ZodObject<{
            produtoId: z.ZodString;
            quantidade: z.ZodCoercedNumber<unknown>;
            valorPorUnidade: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=operacao.schemas.d.ts.map