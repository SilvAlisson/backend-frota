"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ManutencaoController_1 = require("../controllers/ManutencaoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const operacao_schemas_1 = require("../schemas/operacao.schemas");
const router = (0, express_1.Router)();
const manutencaoController = new ManutencaoController_1.ManutencaoController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(operacao_schemas_1.manutencaoSchema), manutencaoController.create);
router.put('/:id', (0, validate_1.validate)(operacao_schemas_1.manutencaoSchema), manutencaoController.update);
router.get('/recentes', manutencaoController.listRecent);
router.delete('/:id', manutencaoController.delete);
exports.default = router;
//# sourceMappingURL=manutencao.routes.js.map