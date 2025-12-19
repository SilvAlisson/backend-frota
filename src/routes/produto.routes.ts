import { Router } from 'express';
import { ProdutoController } from '../controllers/ProdutoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { produtoSchema } from '../schemas/produto.schemas';

const router = Router();
const produtoController = new ProdutoController();

router.use(authenticateToken);

router.post('/', validate(produtoSchema), produtoController.create);
router.get('/', produtoController.list);
router.get('/:id', produtoController.getById);
router.put('/:id', validate(produtoSchema), produtoController.update);
router.delete('/:id', produtoController.delete);

export default router;