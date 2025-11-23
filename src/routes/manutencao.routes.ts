import { Router } from 'express';
import { ManutencaoController } from '../controllers/ManutencaoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.post('/', ManutencaoController.create);
router.get('/recentes', ManutencaoController.listRecent);
router.delete('/:id', ManutencaoController.delete);

export default router;