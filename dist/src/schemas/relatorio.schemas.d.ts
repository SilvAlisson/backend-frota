import { z } from 'zod';
export declare const relatorioQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        ano: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        mes: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        veiculoId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=relatorio.schemas.d.ts.map