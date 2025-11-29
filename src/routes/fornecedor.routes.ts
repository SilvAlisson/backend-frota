import { Router } from 'express';
import { FornecedorController } from '../controllers/FornecedorController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { fornecedorSchema } from '../schemas/fornecedor.schemas';

const router = Router();
router.use(authenticateToken);

router.post('/', validate(fornecedorSchema), FornecedorController.create);
router.put('/:id', validate(fornecedorSchema), FornecedorController.update);

router.get('/', FornecedorController.list);
router.get('/:id', FornecedorController.getById);
router.delete('/:id', FornecedorController.delete);

export default router;