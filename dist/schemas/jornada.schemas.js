"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscaJornadaSchema = exports.finalizarJornadaSchema = exports.iniciarJornadaSchema = void 0;
const zod_1 = require("zod");
// Schema para Iniciar Jornada
exports.iniciarJornadaSchema = zod_1.z.object({
    body: zod_1.z.object({
        veiculoId: zod_1.z.string({ error: "Veículo obrigatório" }).min(1, { error: "Veículo obrigatório" }),
        // Se for enviado manualmente 
        encarregadoId: zod_1.z.string({ error: "Encarregado obrigatório" }).min(1, { error: "Encarregado obrigatório" }),
        kmInicio: zod_1.z.coerce.number({ error: "KM inválido" })
            .positive({ error: "KM deve ser positivo" }),
        // Transformação para garantir null no banco (evita erro de tipagem '{} | null')
        observacoes: zod_1.z.string().optional().nullable().transform(v => v || null),
        fotoInicioUrl: zod_1.z.string().optional().nullable().transform(v => v || null),
    })
});
// Schema para Finalizar Jornada (ID vem na URL, dados no Body)
exports.finalizarJornadaSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ error: "ID da jornada obrigatório" })
    }),
    body: zod_1.z.object({
        kmFim: zod_1.z.coerce.number({ error: "KM final inválido" })
            .positive({ error: "KM deve ser positivo" }),
        observacoes: zod_1.z.string().optional().nullable().transform(v => v || null),
        fotoFimUrl: zod_1.z.string().optional().nullable().transform(v => v || null),
    })
});
// Schema para Busca/Histórico (Query Params)
exports.buscaJornadaSchema = zod_1.z.object({
    query: zod_1.z.object({
        dataInicio: zod_1.z.string().optional(),
        dataFim: zod_1.z.string().optional(),
        veiculoId: zod_1.z.string().optional(),
        operadorId: zod_1.z.string().optional()
    })
});
//# sourceMappingURL=jornada.schemas.js.map