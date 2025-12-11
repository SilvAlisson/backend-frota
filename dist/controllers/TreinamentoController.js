"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreinamentoController = void 0;
const prisma_1 = require("../lib/prisma");
class TreinamentoController {
    // Cadastrar um treinamento (Manual)
    static async create(req, res) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        try {
            // Dados já validados pelo middleware
            const { userId, nome, dataRealizacao, descricao, dataVencimento, comprovanteUrl } = req.body;
            const treinamento = await prisma_1.prisma.treinamento.create({
                data: {
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao,
                    // CORREÇÃO: Forçar null se for undefined
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
        try {
            const { userId, treinamentos } = req.body;
            // createMany é otimizado para inserções em lote
            const resultado = await prisma_1.prisma.treinamento.createMany({
                data: treinamentos.map(t => ({
                    userId,
                    nome: t.nome,
                    dataRealizacao: t.dataRealizacao,
                    descricao: t.descricao ?? null,
                    dataVencimento: t.dataVencimento ?? null,
                    comprovanteUrl: null // Importação geralmente não tem comprovante
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
        const { userId } = req.params;
        if (!userId)
            return res.status(400).json({ error: "ID de usuário inválido" });
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
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: "ID inválido" });
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