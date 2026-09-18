import { Router } from 'express';
import { authRouter } from './authRoutes';
import { catalogRouter } from './catalogRoutes';
import { salesRouter } from './salesRoutes';
import { shiftRouter } from './shiftRoutes';
import { customerRouter } from './customerRoutes';
import { expenseRouter } from './expenseRoutes';
import { reportRouter } from './reportRoutes';

export const router = Router();

// Mount Modular Resource Routers
router.use('/auth', authRouter);
router.use('/', authRouter);
router.use('/catalog', catalogRouter);
router.use('/sales', salesRouter);
router.use('/shifts', shiftRouter);
router.use('/customers', customerRouter);
router.use('/expenses', expenseRouter);
router.use('/reports', reportRouter);
