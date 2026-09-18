import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/auth';

export const expenseRouter = Router();

expenseRouter.use(authMiddleware);
expenseRouter.get('/', ExpenseController.getExpenses);
expenseRouter.post('/', ExpenseController.createExpense);
expenseRouter.delete('/:id', ExpenseController.deleteExpense);
