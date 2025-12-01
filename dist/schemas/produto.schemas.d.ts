import { z } from 'zod';
export declare const produtoSchema: z.ZodObject<{
    nome: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    tipo: z.ZodEnum<{
        COMBUSTIVEL: "COMBUSTIVEL";
        ADITIVO: "ADITIVO";
        SERVICO: "SERVICO";
        OUTRO: "OUTRO";
    }>;
    unidadeMedida: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=produto.schemas.d.ts.map