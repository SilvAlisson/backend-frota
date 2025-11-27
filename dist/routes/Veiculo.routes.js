"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VeiculoController_1 = require("../controllers/VeiculoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Todas as rotas de veículo são protegidas
router.use(auth_1.authenticateToken);
router.post('/', VeiculoController_1.VeiculoController.create);
router.get('/', VeiculoController_1.VeiculoController.list);
router.get('/:id', VeiculoController_1.VeiculoController.getById);
router.put('/:id', VeiculoController_1.VeiculoController.update);
router.delete('/:id', VeiculoController_1.VeiculoController.delete);
exports.default = router;
//# sourceMappingURL=Veiculo.routes.js.map