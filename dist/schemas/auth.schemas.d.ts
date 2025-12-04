import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const registerUserSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodEmail;
    password: z.ZodString;
    role: z.ZodEnum<{
        OPERADOR: "OPERADOR";
        ENCARREGADO: "ENCARREGADO";
        ADMIN: "ADMIN";
        RH: "RH";
        COORDENADOR: "COORDENADOR";
    }>;
    matricula: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cnhNumero: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cnhCategoria: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cnhValidade: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dataAdmissao: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=auth.schemas.d.ts.map