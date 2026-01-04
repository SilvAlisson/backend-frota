import { z } from 'zod';
export declare const veiculoSchema: z.ZodObject<{
    body: z.ZodObject<{
        placa: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        modelo: z.ZodString;
        marca: z.ZodString;
        ano: z.ZodCoercedNumber<unknown>;
        tipoVeiculo: z.ZodPipe<z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodTransform<string | null, string | null | undefined>>;
        tipoCombustivel: z.ZodDefault<z.ZodEnum<{
            DIESEL_S10: "DIESEL_S10";
            GASOLINA_COMUM: "GASOLINA_COMUM";
            ETANOL: "ETANOL";
            GNV: "GNV";
        }>>;
        capacidadeTanque: z.ZodNullable<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            ATIVO: "ATIVO";
            EM_MANUTENCAO: "EM_MANUTENCAO";
            INATIVO: "INATIVO";
        }>>>;
        vencimentoCiv: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        vencimentoCipp: z.ZodNullable<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        kmAtual: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=veiculo.schemas.d.ts.map