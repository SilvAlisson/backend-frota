import { Router } from 'express';
import { VeiculoController } from '../controllers/VeiculoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas as rotas de veículo são protegidas
router.use(authenticateToken);

router.post('/', VeiculoController.create);
router.get('/', VeiculoController.list);
router.get('/:id', VeiculoController.getById);
router.put('/:id', VeiculoController.update);
router.delete('/:id', VeiculoController.delete);

export default router;