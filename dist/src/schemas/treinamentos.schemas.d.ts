import { z } from 'zod';
export declare const createTreinamentoSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        nome: z.ZodString;
        descricao: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        dataRealizacao: z.ZodCoercedDate<unknown>;
        dataVencimento: z.ZodPipe<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>>, z.ZodTransform<Date | null, Date | null | undefined>>;
        comprovanteUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        requisitoId: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const importTreinamentosSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        treinamentos: z.ZodArray<z.ZodObject<{
            nome: z.ZodString;
            descricao: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
            dataRealizacao: z.ZodCoercedDate<unknown>;
            dataVencimento: z.ZodPipe<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>>, z.ZodTransform<Date | null, Date | null | undefined>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=treinamentos.schemas.d.ts.map