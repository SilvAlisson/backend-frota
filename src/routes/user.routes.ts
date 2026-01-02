import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerUserSchema } from '../schemas/auth.schemas';

const router = Router();
const userController = new UserController();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// CREATE
router.post('/register',
    validate(registerUserSchema),
    userController.create
);

// LIST
router.get('/', userController.list);

// GET BY ID
router.get('/:id', userController.getById);

// UPDATE
router.put('/:id', userController.update);

// DELETE
router.delete('/:id', userController.delete);

export default router;