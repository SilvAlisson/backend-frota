"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreinamentoController = void 0;
const prisma_1 = require("../lib/prisma");
class TreinamentoController {
    // Cadastrar um treinamento (Manual)
    create = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { userId, nome, dataRealizacao, descricao, dataVencimento, comprovanteUrl } = req.body;
            const treinamento = await prisma_1.prisma.treinamento.create({
                data: {
                    // Usamos connect para garantir a integridade da relação
                    user: { connect: { id: userId } },
                    nome,
                    dataRealizacao, // Já vem como Date do Zod (coerce)
                    // Fallbacks explícitos para evitar o erro de tipagem {} | null
                    descricao: descricao ?? null,
                    dataVencimento: dataVencimento ?? null,
                    comprovanteUrl: comprovanteUrl ?? null
                }
            });
            res.status(201).json(treinamento);
        }
        catch (error) {
            next(error);
        }
    };
    // Importação em massa via Excel
    importar = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { userId, treinamentos } = req.body;
            // createMany é performático, mas exige que passemos o userId escalar diretamente
            const resultado = await prisma_1.prisma.treinamento.createMany({
                data: treinamentos.map(t => ({
                    userId,
                    nome: t.nome,
                    dataRealizacao: t.dataRealizacao,
                    descricao: t.descricao ?? null,
                    dataVencimento: t.dataVencimento ?? null,
                    comprovanteUrl: null // Importações em massa geralmente não trazem arquivos
                }))
            });
            res.status(201).json({
                message: 'Importação concluída com sucesso',
                count: resultado.count
            });
        }
        catch (error) {
            next(error);
        }
    };
    // Listar treinamentos de um usuário
    listByUser = async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (!userId) {
                res.status(400).json({ error: "ID de usuário inválido" });
                return;
            }
            const treinamentos = await prisma_1.prisma.treinamento.findMany({
                where: { userId },
                orderBy: { dataRealizacao: 'desc' }
            });
            res.json(treinamentos);
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: "ID inválido" });
                return;
            }
            await prisma_1.prisma.treinamento.delete({ where: { id } });
            res.json({ message: 'Registro removido.' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.TreinamentoController = TreinamentoController;
//# sourceMappingURL=TreinamentoController.js.map