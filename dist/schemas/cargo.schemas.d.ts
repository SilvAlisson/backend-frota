import { z } from 'zod';
export declare const cargoSchema: z.ZodObject<{
    nome: z.ZodString;
    descricao: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    requisitos: z.ZodOptional<z.ZodArray<z.ZodObject<{
        nome: z.ZodString;
        validadeMeses: z.ZodNumber;
        diasAntecedenciaAlerta: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const addRequisitoSchema: z.ZodObject<{
    nome: z.ZodString;
    validadeMeses: z.ZodNumber;
    diasAntecedenciaAlerta: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
//# sourceMappingURL=cargo.schemas.d.ts.map