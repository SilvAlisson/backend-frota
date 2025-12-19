import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const registerUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        nome: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            ADMIN: "ADMIN";
            ENCARREGADO: "ENCARREGADO";
            OPERADOR: "OPERADOR";
            RH: "RH";
            COORDENADOR: "COORDENADOR";
        }>>>;
        matricula: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        cargoId: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        fotoUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        cnhNumero: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        cnhCategoria: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        cnhValidade: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        dataAdmissao: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const loginWithTokenSchema: z.ZodObject<{
    body: z.ZodObject<{
        loginToken: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const generateTokenSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=auth.schemas.d.ts.map