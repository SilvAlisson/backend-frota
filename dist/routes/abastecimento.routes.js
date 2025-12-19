"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AbastecimentoController_1 = require("../controllers/AbastecimentoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const operacao_schemas_1 = require("../schemas/operacao.schemas");
const router = (0, express_1.Router)();
const abastecimentoController = new AbastecimentoController_1.AbastecimentoController();
router.use(auth_1.authenticateToken);
// 2. Usamos a instância nas rotas:
router.post('/', (0, validate_1.validate)(operacao_schemas_1.abastecimentoSchema), abastecimentoController.create);
router.get('/recentes', abastecimentoController.listRecent);
router.delete('/:id', abastecimentoController.delete);
exports.default = router;
//# sourceMappingURL=abastecimento.routes.js.map