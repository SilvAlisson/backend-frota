import { z } from 'zod';
export declare const createTreinamentoSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        nome: z.ZodString;
        descricao: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        dataRealizacao: z.ZodCoercedDate<unknown>;
        dataVencimento: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        comprovanteUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const importTreinamentosSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        treinamentos: z.ZodArray<z.ZodObject<{
            nome: z.ZodString;
            descricao: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            dataRealizacao: z.ZodCoercedDate<unknown>;
            dataVencimento: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=treinamentos.schemas.d.ts.map