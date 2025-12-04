"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreinamentoController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const treinamentos_schemas_1 = require("../schemas/treinamentos.schemas");
// Schemas Locais para IDs
const userIdParamSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, { error: "ID de usuário inválido" })
});
const idParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, { error: "ID obrigatório" })
});
class TreinamentoController {
    // Cadastrar um treinamento (Manual)
    static async create(req, res) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const validation = treinamentos_schemas_1.createTreinamentoSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { userId, nome, dataRealizacao, descricao, dataVencimento, comprovanteUrl } = validation.data;
        try {
            const treinamento = await prisma_1.prisma.treinamento.create({
                data: {
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao,
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
    // Importação em massa via Excel
    static async importar(req, res) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        const validation = treinamentos_schemas_1.importTreinamentosSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados de importação inválidos',
                details: validation.error.format()
            });
        }
        const { userId, treinamentos } = validation.data;
        try {
            // createMany é otimizado para inserções em lote
            const resultado = await prisma_1.prisma.treinamento.createMany({
                data: treinamentos.map(t => ({
                    userId,
                    nome: t.nome,
                    descricao: t.descricao || null,
                    dataRealizacao: t.dataRealizacao,
                    dataVencimento: t.dataVencimento || null,
                    comprovanteUrl: null
                }))
            });
            res.status(201).json({
                message: 'Importação concluída com sucesso',
                count: resultado.count
            });
        }
        catch (e) {
            console.error("Erro na importação:", e);
            res.status(500).json({ error: 'Erro ao importar treinamentos.' });
        }
    }
    // Listar treinamentos
    static async listByUser(req, res) {
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