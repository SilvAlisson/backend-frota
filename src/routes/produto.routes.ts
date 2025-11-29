import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { produtoSchema } from '../schemas/produto.schemas';

const router = Router();
router.use(authenticateToken);

router.post('/', validate(produtoSchema), ProdutoController.create);
router.put('/:id', validate(produtoSchema), ProdutoController.update);

router.get('/', ProdutoController.list);
router.get('/:id', ProdutoController.getById);
router.delete('/:id', ProdutoController.delete);

export default router;