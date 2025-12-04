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
router.post('/verificar-timeouts', JornadaController_1.JornadaController.verificarTimeouts);
router.get('/historico', JornadaController_1.JornadaController.listarHistorico);
router.delete('/:id', JornadaController_1.JornadaController.delete);
exports.default = router;
//# sourceMappingURL=jornada.routes.js.map