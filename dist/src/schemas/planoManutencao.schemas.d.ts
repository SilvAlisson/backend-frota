import { z } from 'zod';
export declare const planoManutencaoSchema: z.ZodObject<{
    body: z.ZodObject<{
        veiculoId: z.ZodString;
        descricao: z.ZodString;
        tipoIntervalo: z.ZodEnum<{
            KM: "KM";
            TEMPO: "TEMPO";
        }>;
        valorIntervalo: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=planoManutencao.schemas.d.ts.map