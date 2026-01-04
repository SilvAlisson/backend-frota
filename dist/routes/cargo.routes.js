"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CargoController_1 = require("../controllers/CargoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const cargo_schemas_1 = require("../schemas/cargo.schemas");
const router = (0, express_1.Router)();
const cargoController = new CargoController_1.CargoController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(cargo_schemas_1.cargoSchema), cargoController.create);
router.get('/', cargoController.list);
router.delete('/:id', cargoController.delete);
router.post('/:id/requisitos', (0, validate_1.validate)(cargo_schemas_1.addRequisitoSchema), cargoController.addRequisito);
router.delete('/requisitos/:requisitoId', cargoController.removeRequisito);
exports.default = router;
//# sourceMappingURL=cargo.routes.js.map