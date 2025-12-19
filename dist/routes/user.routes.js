"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_schemas_1 = require("../schemas/auth.schemas");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
// Middleware de autenticação para todas as rotas
router.use(auth_1.authenticateToken);
// CREATE
router.post('/', (0, validate_1.validate)(auth_schemas_1.registerUserSchema), userController.create);
// LIST
router.get('/', userController.list);
// GET BY ID
router.get('/:id', userController.getById);
// UPDATE
// Nota: Se quiser validar o update, crie um 'updateUserSchema' no Zod depois.
router.put('/:id', userController.update);
// DELETE
router.delete('/:id', userController.delete);
exports.default = router;
//# sourceMappingURL=user.routes.js.map