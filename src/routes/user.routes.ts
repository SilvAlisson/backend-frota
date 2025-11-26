import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerUserSchema } from '../schemas/auth.schemas';

const router = Router();

// Middleware global de autenticação para todas as rotas abaixo
router.use(authenticateToken);

// Apenas ADMIN pode criar usuários + Validação Zod
router.post('/register',
    authorize(['ADMIN']),
    validate(registerUserSchema),
    UserController.create
);

// Qualquer autenticado vê a lista (ou restrinja se quiser)
router.get('/', UserController.list);

// Apenas ADMIN vê detalhes
router.get('/:id', authorize(['ADMIN']), UserController.getById);

// Apenas ADMIN edita
router.put('/:id', authorize(['ADMIN']), UserController.update);

// Apenas ADMIN deleta
router.delete('/:id', authorize(['ADMIN']), UserController.delete);

export default router;