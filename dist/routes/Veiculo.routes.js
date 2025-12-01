"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VeiculoController_1 = require("../controllers/VeiculoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const veiculo_schemas_1 = require("../schemas/veiculo.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// Adicionado o middleware validate()
router.post('/', (0, validate_1.validate)(veiculo_schemas_1.veiculoSchema), VeiculoController_1.VeiculoController.create);
router.put('/:id', (0, validate_1.validate)(veiculo_schemas_1.veiculoSchema), VeiculoController_1.VeiculoController.update);
router.get('/', VeiculoController_1.VeiculoController.list);
router.get('/:id', VeiculoController_1.VeiculoController.getById);
router.delete('/:id', VeiculoController_1.VeiculoController.delete);
exports.default = router;
//# sourceMappingURL=Veiculo.routes.js.map