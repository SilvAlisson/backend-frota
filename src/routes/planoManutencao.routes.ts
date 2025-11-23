import { Router } from 'express';
import { PlanoManutencaoController } from '../controllers/PlanoManutencaoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', PlanoManutencaoController.create);
router.get('/', PlanoManutencaoController.list);
router.delete('/:id', PlanoManutencaoController.delete);

export default router;