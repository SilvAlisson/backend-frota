import { Router } from 'express';
import { AbastecimentoController } from '../controllers/AbastecimentoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.post('/', AbastecimentoController.create);
router.get('/recentes', AbastecimentoController.listRecent);
router.delete('/:id', AbastecimentoController.delete);

export default router;