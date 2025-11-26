"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JornadaController_1 = require("../controllers/JornadaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/iniciar', JornadaController_1.JornadaController.iniciar);
router.put('/finalizar/:id', JornadaController_1.JornadaController.finalizar);
router.get('/abertas', JornadaController_1.JornadaController.listarAbertas);
router.get('/minhas-abertas-operador', JornadaController_1.JornadaController.listarMinhasAbertas);
exports.default = router;
//# sourceMappingURL=jornada.routes.js.map