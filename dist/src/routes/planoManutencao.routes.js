"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PlanoManutencaoController_1 = require("../controllers/PlanoManutencaoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const planoManutencao_schemas_1 = require("../schemas/planoManutencao.schemas");
const router = (0, express_1.Router)();
const controller = new PlanoManutencaoController_1.PlanoManutencaoController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(planoManutencao_schemas_1.planoManutencaoSchema), controller.create);
router.get('/', controller.list);
router.delete('/:id', controller.delete);
exports.default = router;
//# sourceMappingURL=planoManutencao.routes.js.map