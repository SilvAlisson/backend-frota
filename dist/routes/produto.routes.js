"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProdutoController_1 = require("../controllers/ProdutoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const produto_schemas_1 = require("../schemas/produto.schemas");
const router = (0, express_1.Router)();
const produtoController = new ProdutoController_1.ProdutoController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(produto_schemas_1.produtoSchema), produtoController.create);
router.get('/', produtoController.list);
router.get('/:id', produtoController.getById);
router.put('/:id', (0, validate_1.validate)(produto_schemas_1.produtoSchema), produtoController.update);
router.delete('/:id', produtoController.delete);
exports.default = router;
//# sourceMappingURL=produto.routes.js.map