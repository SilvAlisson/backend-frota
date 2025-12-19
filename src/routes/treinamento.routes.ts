import { Router } from 'express';
import { TreinamentoController } from '../controllers/TreinamentoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTreinamentoSchema, importTreinamentosSchema } from '../schemas/treinamentos.schemas';

const router = Router();
const controller = new TreinamentoController();

router.use(authenticateToken);

// Cadastro Manual
router.post('/', validate(createTreinamentoSchema), controller.create);

// Importação em Massa
router.post('/importar', validate(importTreinamentosSchema), controller.importar);

// Listar por Usuário
router.get('/usuario/:userId', controller.listByUser);

// Deletar
router.delete('/:id', controller.delete);

export default router;