import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const registerUserSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<{
        OPERADOR: "OPERADOR";
        ENCARREGADO: "ENCARREGADO";
        ADMIN: "ADMIN";
    }>;
    matricula: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=auth.schemas.d.ts.map