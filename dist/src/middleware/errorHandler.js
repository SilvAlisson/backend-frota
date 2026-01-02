"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const errorHandler = (error, req, res, next) => {
    // Log do erro para debug no servidor (evita vazar stack trace para o cliente em produção)
    console.error(`🔴 Erro em ${req.method} ${req.url}:`, error);
    // 1. Erros de Validação
    if (error instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Erro de validação',
            detalhes: error.issues.map((issue) => ({
                campo: issue.path.join('.'),
                mensagem: issue.message,
                codigo: issue.code
            }))
        });
    }
    // 2. Erros do Prisma (Banco de Dados)
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        // P2002: Violação de chave única (ex: Email ou Placa duplicada)
        if (error.code === 'P2002') {
            const targets = error.meta?.target || [];
            return res.status(409).json({
                error: 'Conflito de dados',
                mensagem: `Já existe um registro com este(a) ${targets.join(', ')}.`
            });
        }
        // P2025: Registro não encontrado para update/delete
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Registro não encontrado.' });
        }
        // P2003: Violação de chave estrangeira (Delete cascade falhou ou ID inválido)
        if (error.code === 'P2003') {
            return res.status(409).json({
                error: 'Não é possível realizar esta operação.',
                mensagem: 'Este registro possui dependências (ex: históricos, jornadas) e não pode ser removido ou alterado.'
            });
        }
    }
    // 3. Erro Genérico (Fallback)
    return res.status(500).json({
        error: 'Erro interno do servidor',
        mensagem: 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map