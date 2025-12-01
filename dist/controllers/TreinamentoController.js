"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreinamentoController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
// --- Schemas ---
const createTreinamentoSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    nome: zod_1.z.string().min(2, "Nome do treinamento obrigatório"),
    descricao: zod_1.z.string().optional().nullable(),
    dataRealizacao: zod_1.z.coerce.date(),
    dataVencimento: zod_1.z.coerce.date().optional().nullable(),
    comprovanteUrl: zod_1.z.string().url().optional().nullable(),
});
const userIdParamSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid("ID de usuário inválido")
});
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "ID obrigatório")
});
// ----------------
class TreinamentoController {
    // Cadastrar um treinamento para um usuário
    static async create(req, res) {
        // Apenas RH ou Admin pode lançar
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const validation = createTreinamentoSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: validation.error.format() });
        }
        const { userId, nome, dataRealizacao, descricao, dataVencimento, comprovanteUrl } = validation.data;
        try {
            const treinamento = await prisma_1.prisma.treinamento.create({
                data: {
                    // Conecta ao usuário existente
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao,
                    // Garante que undefined vire null para satisfazer o Prisma
                    descricao: descricao ?? null,
                    dataVencimento: dataVencimento ?? null,
                    comprovanteUrl: comprovanteUrl ?? null
                }
            });
            res.status(201).json(treinamento);
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Erro ao registrar treinamento.' });
        }
    }
    // Listar treinamentos de um usuário específico
    static async listByUser(req, res) {
        // Valida req.params para garantir que userId existe e é string
        const paramsCheck = userIdParamSchema.safeParse(req.params);
        if (!paramsCheck.success) {
            return res.status(400).json({ error: "ID de usuário inválido" });
        }
        const { userId } = paramsCheck.data;
        try {
            const treinamentos = await prisma_1.prisma.treinamento.findMany({
                where: { userId },
                orderBy: { dataRealizacao: 'desc' }
            });
            res.json(treinamentos);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao buscar treinamentos.' });
        }
    }
    static async delete(req, res) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || ''))
            return res.sendStatus(403);
        // Valida req.params para garantir que id existe
        const paramsCheck = idParamSchema.safeParse(req.params);
        if (!paramsCheck.success) {
            return res.status(400).json({ error: "ID inválido" });
        }
        const { id } = paramsCheck.data;
        try {
            await prisma_1.prisma.treinamento.delete({ where: { id } });
            res.json({ message: 'Registro removido.' });
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao remover.' });
        }
    }
}
exports.TreinamentoController = TreinamentoController;
//# sourceMappingURL=TreinamentoController.js.map