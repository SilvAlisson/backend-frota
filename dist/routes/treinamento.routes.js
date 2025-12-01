"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TreinamentoController_1 = require("../controllers/TreinamentoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware de autenticação para todas as rotas
router.use(auth_1.authenticateToken);
// Rotas
router.post('/', TreinamentoController_1.TreinamentoController.create);
router.get('/user/:userId', TreinamentoController_1.TreinamentoController.listByUser);
router.delete('/:id', TreinamentoController_1.TreinamentoController.delete);
exports.default = router;
//# sourceMappingURL=treinamento.routes.js.map