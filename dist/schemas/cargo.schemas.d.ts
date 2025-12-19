import { z } from 'zod';
export declare const cargoSchema: z.ZodObject<{
    body: z.ZodObject<{
        nome: z.ZodString;
        descricao: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        requisitos: z.ZodOptional<z.ZodArray<z.ZodObject<{
            nome: z.ZodString;
            validadeMeses: z.ZodCoercedNumber<unknown>;
            diasAntecedenciaAlerta: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const addRequisitoSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        nome: z.ZodString;
        validadeMeses: z.ZodCoercedNumber<unknown>;
        diasAntecedenciaAlerta: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=cargo.schemas.d.ts.map