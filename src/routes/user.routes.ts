import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerUserSchema } from '../schemas/auth.schemas';

const router = Router();

router.use(authenticateToken);

// Criar Usuário (Validação Completa)
router.post('/register',
    authorize(['ADMIN', 'RH']),
    validate(registerUserSchema),
    UserController.create
);

router.get('/', UserController.list);
router.get('/:id', authorize(['ADMIN', 'RH']), UserController.getById);

// Update: Por enquanto sem validação Zod estrita para permitir parciais, 
// ou você pode criar um 'updateUserSchema' onde todos os campos são .optional()
router.put('/:id', authorize(['ADMIN', 'RH']), UserController.update);

router.delete('/:id', authorize(['ADMIN', 'RH']), UserController.delete);

export default router;