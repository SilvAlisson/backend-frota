import { z } from 'zod';
export declare const fornecedorSchema: z.ZodObject<{
    nome: z.ZodString;
    cnpj: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=fornecedor.schemas.d.ts.map