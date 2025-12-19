import { Router } from 'express';
import { AbastecimentoController } from '../controllers/AbastecimentoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { abastecimentoSchema } from '../schemas/operacao.schemas';

const router = Router();
const abastecimentoController = new AbastecimentoController();

router.use(authenticateToken);

// Rotas de Criação e Listagem
router.post('/',
    validate(abastecimentoSchema),
    abastecimentoController.create
);

router.get('/recentes', abastecimentoController.listRecent);

// --- ROTAS PARA EDIÇÃO ---
router.get('/:id', abastecimentoController.getById);
router.put('/:id', 
    validate(abastecimentoSchema), 
    abastecimentoController.update
);

// Rota de Remoção
router.delete('/:id', abastecimentoController.delete);

export default router;