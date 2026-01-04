"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FornecedorController_1 = require("../controllers/FornecedorController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const fornecedor_schemas_1 = require("../schemas/fornecedor.schemas");
const router = (0, express_1.Router)();
const fornecedorController = new FornecedorController_1.FornecedorController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(fornecedor_schemas_1.fornecedorSchema), fornecedorController.create);
router.get('/', fornecedorController.list);
router.get('/:id', fornecedorController.getById);
router.put('/:id', (0, validate_1.validate)(fornecedor_schemas_1.fornecedorSchema), fornecedorController.update);
router.delete('/:id', fornecedorController.delete);
exports.default = router;
//# sourceMappingURL=fornecedor.routes.js.map