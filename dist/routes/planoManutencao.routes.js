"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PlanoManutencaoController_1 = require("../controllers/PlanoManutencaoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', PlanoManutencaoController_1.PlanoManutencaoController.create);
router.get('/', PlanoManutencaoController_1.PlanoManutencaoController.list);
router.delete('/:id', PlanoManutencaoController_1.PlanoManutencaoController.delete);
exports.default = router;
//# sourceMappingURL=planoManutencao.routes.js.map