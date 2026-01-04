"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const Sentry = __importStar(require("@sentry/node")); // [ADICIONADO] Import do Sentry
const errorHandler = (error, req, res, next) => {
    // 1. REPORTAR PARA O SENTRY
    // Só enviamos para o Sentry erros que NÃO sejam de validação (400) 
    // para focar no que é erro de sistema/banco.
    if (!(error instanceof zod_1.ZodError)) {
        Sentry.captureException(error);
    }
    // Log visual no console do servidor
    console.error(`🔴 Erro em ${req.method} ${req.url}:`, error);
    // 2. Erros de Validação (Zod)
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
    // 3. Erros do Prisma (Banco de Dados)
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const targets = error.meta?.target || [];
            return res.status(409).json({
                error: 'Conflito de dados',
                mensagem: `Já existe um registro com este(a) ${targets.join(', ')}.`
            });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Registro não encontrado.' });
        }
        if (error.code === 'P2003') {
            return res.status(409).json({
                error: 'Não é possível realizar esta operação.',
                mensagem: 'Este registro possui dependências e não pode ser alterado.'
            });
        }
    }
    // 4. Erro Genérico (Fallback) - Adicionado o eventId para rastreio fácil
    return res.status(500).json({
        error: 'Erro interno do servidor',
        mensagem: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
        sentryEventId: Sentry.lastEventId() // O usuário pode te passar esse código se o sistema travar
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map