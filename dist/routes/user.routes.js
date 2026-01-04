"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const auth_schemas_1 = require("../schemas/auth.schemas");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
router.use(auth_1.authenticateToken);
router.post('/', (0, validate_1.validate)(auth_schemas_1.registerUserSchema), userController.create);
router.get('/', userController.list);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);
exports.default = router;
//# sourceMappingURL=user.routes.js.map