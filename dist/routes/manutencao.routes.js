"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ManutencaoController_1 = require("../controllers/ManutencaoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', ManutencaoController_1.ManutencaoController.create);
router.get('/recentes', ManutencaoController_1.ManutencaoController.listRecent);
router.delete('/:id', ManutencaoController_1.ManutencaoController.delete);
exports.default = router;
//# sourceMappingURL=manutencao.routes.js.map