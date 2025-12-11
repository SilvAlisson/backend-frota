import { z } from 'zod';
export declare const produtoSchema: z.ZodObject<{
    body: z.ZodObject<{
        nome: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        tipo: z.ZodEnum<{
            LAVAGEM: "LAVAGEM";
            COMBUSTIVEL: "COMBUSTIVEL";
            ADITIVO: "ADITIVO";
            PECA: "PECA";
            SERVICO: "SERVICO";
            OUTRO: "OUTRO";
        }>;
        unidadeMedida: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=produto.schemas.d.ts.map