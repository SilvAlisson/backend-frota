import { Router } from 'express';
import { TreinamentoController } from '../controllers/TreinamentoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rotas
router.post('/', TreinamentoController.create);
router.post('/importar', TreinamentoController.importar);
router.get('/user/:userId', TreinamentoController.listByUser);
router.delete('/:id', TreinamentoController.delete);

export default router;