"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/register', UserController_1.UserController.create);
router.get('/', UserController_1.UserController.list);
router.get('/:id', UserController_1.UserController.getById);
router.put('/:id', UserController_1.UserController.update);
router.delete('/:id', UserController_1.UserController.delete);
exports.default = router;
//# sourceMappingURL=user.routes.js.map