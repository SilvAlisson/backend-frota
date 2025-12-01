"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AbastecimentoController_1 = require("../controllers/AbastecimentoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const operacao_schemas_1 = require("../schemas/operacao.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(operacao_schemas_1.abastecimentoSchema), AbastecimentoController_1.AbastecimentoController.create);
router.get('/recentes', AbastecimentoController_1.AbastecimentoController.listRecent);
router.delete('/:id', AbastecimentoController_1.AbastecimentoController.delete);
exports.default = router;
//# sourceMappingURL=abastecimento.routes.js.map