"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RelatorioController_1 = require("../controllers/RelatorioController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/sumario', RelatorioController_1.RelatorioController.sumario);
router.get('/ranking-operadores', RelatorioController_1.RelatorioController.ranking);
router.get('/alertas', RelatorioController_1.RelatorioController.alertas);
exports.default = router;
//# sourceMappingURL=relatorio.routes.js.map