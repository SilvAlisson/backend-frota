import { z } from 'zod';
export declare const fornecedorSchema: z.ZodObject<{
    body: z.ZodObject<{
        nome: z.ZodString;
        tipo: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            POSTO: "POSTO";
            OFICINA: "OFICINA";
            LAVA_JATO: "LAVA_JATO";
            SEGURADORA: "SEGURADORA";
            OUTROS: "OUTROS";
        }>>>;
        cnpj: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNull, z.ZodUndefined, z.ZodString]>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=fornecedor.schemas.d.ts.map