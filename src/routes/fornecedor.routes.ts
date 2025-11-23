import { Router } from 'express';
import { FornecedorController } from '../controllers/FornecedorController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.post('/', FornecedorController.create);
router.get('/', FornecedorController.list);
router.get('/:id', FornecedorController.getById);
router.put('/:id', FornecedorController.update);
router.delete('/:id', FornecedorController.delete);

export default router;