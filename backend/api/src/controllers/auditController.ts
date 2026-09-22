import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../services/db';

export class AuditController {
  // Get Compliance Audit Trail Logs
  static async getLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, action, entity, startDate, endDate, limit = 100, page = 1 } = req.query;

      const whereClause: any = {};

      if (action && action !== 'ALL') {
        whereClause.action = String(action);
      }

      if (entity && entity !== 'ALL') {
        whereClause.entity = String(entity);
      }

      if (search) {
        const query = String(search).trim();
        whereClause.OR = [
          { action: { contains: query } },
          { entity: { contains: query } },
          { details: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } }
        ];
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = new Date(String(startDate));
        if (endDate) {
          const end = new Date(String(endDate));
          end.setHours(23, 59, 59, 999);
          whereClause.createdAt.lte = end;
        }
      }

      const take = Number(limit) || 100;
      const skip = (Number(page) - 1) * take;

      const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip
        }),
        prisma.auditLog.count({ where: whereClause })
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            totalCount,
            page: Number(page),
            pageSize: take,
            totalPages: Math.ceil(totalCount / take)
          }
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Record System Audit Log Event
  static async createLog(req: AuthenticatedRequest, res: Response) {
    try {
      const { action, entity, entityId, details } = req.body;
      if (!action || !entity) {
        return res.status(400).json({ success: false, error: 'Action and Entity are required fields.' });
      }

      const log = await prisma.auditLog.create({
        data: {
          userId: req.user?.id || null,
          action,
          entity,
          entityId: entityId || null,
          details: details || null
        }
      });

      res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
