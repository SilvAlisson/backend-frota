"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TreinamentoController_1 = require("../controllers/TreinamentoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const treinamentos_schemas_1 = require("../schemas/treinamentos.schemas");
const router = (0, express_1.Router)();
const controller = new TreinamentoController_1.TreinamentoController();
router.use(auth_1.authenticateToken);
// Cadastro Manual
router.post('/', (0, validate_1.validate)(treinamentos_schemas_1.createTreinamentoSchema), controller.create);
// Importação em Massa
router.post('/importar', (0, validate_1.validate)(treinamentos_schemas_1.importTreinamentosSchema), controller.importar);
// Listar por Usuário
router.get('/usuario/:userId', controller.listByUser);
// Deletar
router.delete('/:id', controller.delete);
exports.default = router;
//# sourceMappingURL=treinamento.routes.js.map