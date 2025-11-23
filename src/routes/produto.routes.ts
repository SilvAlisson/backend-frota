import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.post('/', ProdutoController.create);
router.get('/', ProdutoController.list);
router.get('/:id', ProdutoController.getById);
router.put('/:id', ProdutoController.update);
router.delete('/:id', ProdutoController.delete);

export default router;