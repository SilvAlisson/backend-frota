import { z } from 'zod';

// Schema para Iniciar Jornada
export const iniciarJornadaSchema = z.object({
    body: z.object({
        veiculoId: z.string({ error: "Veículo obrigatório" }).min(1, { error: "Veículo obrigatório" }),

        // Se for enviado manualmente 
        encarregadoId: z.string({ error: "Encarregado obrigatório" }).min(1, { error: "Encarregado obrigatório" }).optional(),

        kmInicio: z.coerce.number({ error: "KM inválido" })
            .positive({ error: "KM deve ser positivo" }),

        // Transformação para garantir null no banco (evita erro de tipagem '{} | null')
        observacoes: z.string().optional().nullable().transform(v => v || null),
        fotoInicioUrl: z.string().optional().nullable().transform(v => v || null),
    })
});

// Schema para Finalizar Jornada (ID vem na URL, dados no Body)
export const finalizarJornadaSchema = z.object({
    params: z.object({
        id: z.string({ error: "ID da jornada obrigatório" })
    }),
    body: z.object({
        kmFim: z.coerce.number({ error: "KM final inválido" })
            .positive({ error: "KM deve ser positivo" }),

        observacoes: z.string().optional().nullable().transform(v => v || null),
        fotoFimUrl: z.string().optional().nullable().transform(v => v || null),
    })
});

// Schema para Busca/Histórico (Query Params)
export const buscaJornadaSchema = z.object({
    query: z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        veiculoId: z.string().optional(),
        operadorId: z.string().optional()
    })
});