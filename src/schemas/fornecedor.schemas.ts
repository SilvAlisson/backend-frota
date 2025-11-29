import { z } from 'zod';

export const fornecedorSchema = z.object({
    nome: z.string().min(2, "Nome do fornecedor é obrigatório."),
    cnpj: z.string().optional().nullable(), // Adicione validação de regex de CNPJ aqui futuramente se quiser
});