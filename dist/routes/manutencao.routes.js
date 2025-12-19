"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ManutencaoController_1 = require("../controllers/ManutencaoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const operacao_schemas_1 = require("../schemas/operacao.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Criar Manutenção
router.post('/', (0, validate_1.validate)(operacao_schemas_1.manutencaoSchema), ManutencaoController_1.ManutencaoController.create);
// Editar Manutenção
router.put('/:id', (0, validate_1.validate)(operacao_schemas_1.manutencaoSchema), ManutencaoController_1.ManutencaoController.update);
// Listar Recentes
router.get('/recentes', ManutencaoController_1.ManutencaoController.listRecent);
// Remover Manutenção
router.delete('/:id', ManutencaoController_1.ManutencaoController.delete);
exports.default = router;
//# sourceMappingURL=manutencao.routes.js.map