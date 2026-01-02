import { z } from 'zod';
export declare const iniciarJornadaSchema: z.ZodObject<{
    body: z.ZodObject<{
        veiculoId: z.ZodString;
        encarregadoId: z.ZodString;
        kmInicio: z.ZodCoercedNumber<unknown>;
        observacoes: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        fotoInicioUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const finalizarJornadaSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        kmFim: z.ZodCoercedNumber<unknown>;
        observacoes: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        fotoFimUrl: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const buscaJornadaSchema: z.ZodObject<{
    query: z.ZodObject<{
        dataInicio: z.ZodOptional<z.ZodString>;
        dataFim: z.ZodOptional<z.ZodString>;
        veiculoId: z.ZodOptional<z.ZodString>;
        operadorId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const editarJornadaSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        kmInicio: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        kmFim: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
        dataInicio: z.ZodOptional<z.ZodString>;
        dataFim: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        observacoes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=jornada.schemas.d.ts.map