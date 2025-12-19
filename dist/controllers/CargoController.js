"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CargoController = void 0;
const prisma_1 = require("../lib/prisma");
class CargoController {
    // Criar Cargo + Requisitos iniciais
    create = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { nome, descricao, requisitos } = req.body;
            const cargo = await prisma_1.prisma.cargo.create({
                data: {
                    nome,
                    descricao: descricao ?? null,
                    ...(requisitos && requisitos.length > 0 ? {
                        requisitos: {
                            create: requisitos
                        }
                    } : {})
                },
                include: { requisitos: true }
            });
            res.status(201).json(cargo);
        }
        catch (error) {
            next(error); // Middleware trata P2002 (nome duplicado)
        }
    };
    list = async (req, res, next) => {
        try {
            const cargos = await prisma_1.prisma.cargo.findMany({
                include: {
                    requisitos: true,
                    _count: { select: { colaboradores: true } }
                },
                orderBy: { nome: 'asc' }
            });
            res.json(cargos);
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
                res.status(400).json({ error: "ID inválido." });
                return;
            }
            await prisma_1.prisma.cargo.delete({ where: { id } });
            res.json({ message: 'Cargo removido com sucesso.' });
        }
        catch (error) {
            next(error); // Middleware trata P2003 (FK constraint - colaboradores vinculados)
        }
    };
    // Adicionar um novo treinamento a um cargo existente
    addRequisito = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { id: cargoId } = req.params;
            if (!cargoId) {
                res.status(400).json({ error: "ID do cargo inválido" });
                return;
            }
            const dados = req.body;
            // Opcional: Verificar existência (O erro de FK também trataria, mas 404 é mais claro)
            const cargoExiste = await prisma_1.prisma.cargo.findUnique({ where: { id: cargoId } });
            if (!cargoExiste) {
                res.status(404).json({ error: "Cargo não encontrado" });
                return;
            }
            const requisito = await prisma_1.prisma.treinamentoObrigatorio.create({
                data: {
                    cargo: { connect: { id: cargoId } },
                    nome: dados.nome,
                    validadeMeses: dados.validadeMeses,
                    diasAntecedenciaAlerta: dados.diasAntecedenciaAlerta
                }
            });
            res.json(requisito);
        }
        catch (error) {
            next(error);
        }
    };
    removeRequisito = async (req, res, next) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }
            const { requisitoId } = req.params;
            if (!requisitoId) {
                res.status(400).json({ error: "ID do requisito inválido" });
                return;
            }
            await prisma_1.prisma.treinamentoObrigatorio.delete({ where: { id: requisitoId } });
            res.json({ message: 'Requisito removido.' });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CargoController = CargoController;
//# sourceMappingURL=CargoController.js.map