"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProdutoController_1 = require("../controllers/ProdutoController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const produto_schemas_1 = require("../schemas/produto.schemas");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(produto_schemas_1.produtoSchema), ProdutoController_1.ProdutoController.create);
router.put('/:id', (0, validate_1.validate)(produto_schemas_1.produtoSchema), ProdutoController_1.ProdutoController.update);
router.get('/', ProdutoController_1.ProdutoController.list);
router.get('/:id', ProdutoController_1.ProdutoController.getById);
router.delete('/:id', ProdutoController_1.ProdutoController.delete);
exports.default = router;
//# sourceMappingURL=produto.routes.js.map