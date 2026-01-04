import { z } from 'zod';
export declare const produtoSchema: z.ZodObject<{
    body: z.ZodObject<{
        nome: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        tipo: z.ZodEnum<{
            COMBUSTIVEL: "COMBUSTIVEL";
            ADITIVO: "ADITIVO";
            LAVAGEM: "LAVAGEM";
            PECA: "PECA";
            SERVICO: "SERVICO";
            OUTRO: "OUTRO";
        }>;
        unidadeMedida: z.ZodDefault<z.ZodString>;
        marca: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        codigoBarras: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        estoqueMinimo: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=produto.schemas.d.ts.map