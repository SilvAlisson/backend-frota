import { z } from 'zod';
export declare const veiculoSchema: z.ZodObject<{
    body: z.ZodObject<{
        placa: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        modelo: z.ZodString;
        ano: z.ZodCoercedNumber<unknown>;
        tipoVeiculo: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
        tipoCombustivel: z.ZodDefault<z.ZodEnum<{
            DIESEL_S10: "DIESEL_S10";
            GASOLINA_COMUM: "GASOLINA_COMUM";
            ETANOL: "ETANOL";
            GNV: "GNV";
        }>>;
        capacidadeTanque: z.ZodNullable<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        vencimentoCiv: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        vencimentoCipp: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=veiculo.schemas.d.ts.map