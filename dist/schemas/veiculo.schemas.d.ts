import { z } from 'zod';
export declare const veiculoSchema: z.ZodObject<{
    placa: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    modelo: z.ZodString;
    ano: z.ZodNumber;
    tipoVeiculo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tipoCombustivel: z.ZodDefault<z.ZodEnum<{
        DIESEL_S10: "DIESEL_S10";
        GASOLINA_COMUM: "GASOLINA_COMUM";
        ETANOL: "ETANOL";
        GNV: "GNV";
    }>>;
    capacidadeTanque: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    vencimentoCiv: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    vencimentoCipp: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
//# sourceMappingURL=veiculo.schemas.d.ts.map