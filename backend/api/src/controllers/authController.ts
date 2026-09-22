import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../services/db';

export class AuthController {
  // Business Registration (Sign-Up)
  static async signup(req: Request, res: Response) {
    try {
      const { businessName, adminName, email, password, phone, address, tagline, taxNumber, website, logoUrl } = req.body;

      if (!businessName || !adminName || !email || !password) {
        return res.status(400).json({ success: false, error: 'Business name, admin name, email and password are required.' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'User with this email already exists.' });
      }

      const orgCode = `ORG-${Date.now().toString().slice(-6)}`;
      const branchCode = `BR-${Date.now().toString().slice(-4)}`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Organization (Business)
        const org = await tx.organization.create({
          data: {
            name: businessName,
            code: orgCode,
            tagline: tagline || null,
            taxNumber: taxNumber || null,
            phone: phone || null,
            address: address || null,
            logoUrl: logoUrl || null,
            status: 'ACTIVE'
          } as any
        });

        // 2. Create Initial Branch
        const branch = await tx.branch.create({
          data: {
            organizationId: org.id,
            name: `${businessName} - Main Branch`,
            code: branchCode,
            phone: phone || null,
            address: address || null,
            status: 'ACTIVE'
          }
        });

        // 3. Create Warehouse for Branch
        const warehouse = await tx.warehouse.create({
          data: {
            branchId: branch.id,
            name: `${branch.name} Warehouse`,
            code: `WH-${branchCode}`,
            isPrimary: true
          }
        });

        // 4. Create Register for Branch
        const register = await tx.register.create({
          data: {
            branchId: branch.id,
            name: 'POS Terminal 01',
            code: `REG-${branchCode}-01`,
            isActive: true
          }
        });

        // 5. Create Admin User
        const user = await tx.user.create({
          data: {
            organizationId: org.id,
            branchId: branch.id,
            name: adminName,
            email,
            phone: phone || null,
            passwordHash: password, // Production should hash with bcrypt
            role: 'OWNER',
            roles: 'OWNER,ADMIN,CASHIER',
            permissions: 'pos,shifts,inventory,customers,expenses,reports,admin',
            isActive: true
          } as any
        });

        return { org, branch, warehouse, register, user };
      });

      const rolesArray = result.user.roles.split(',');
      const permissionsArray = ((result.user as any).permissions || 'pos,shifts,inventory,customers,expenses,reports,admin').split(',');

      res.status(201).json({
        success: true,
        data: {
          token: `jwt-token-${result.user.id}`,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            roles: rolesArray,
            permissions: permissionsArray,
            branchId: result.branch.id,
            organizationId: result.org.id,
            organizationName: result.org.name,
            tagline: result.org.tagline,
            taxNumber: result.org.taxNumber,
            phone: result.org.phone,
            address: result.org.address,
            website: (result.org as any).website,
            logoUrl: result.org.logoUrl,
            branches: [{ id: result.branch.id, name: result.branch.name, code: result.branch.code }]
          }
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // User Login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { branch: true, organization: { include: { branches: true } } }
      });

      if (!user || user.passwordHash !== password) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, error: 'User account is currently INACTIVE / Suspended.' });
      }

      if (user.organization.status === 'INACTIVE' && !user.roles.includes('OWNER') && !user.roles.includes('ADMIN')) {
        return res.status(403).json({ success: false, error: 'Business account is currently INACTIVE / Temporarily Closed.' });
      }

      const rolesArray = (user.roles || user.role).split(',');
      const rawPerms = (user as any).permissions || (rolesArray.includes('OWNER') || rolesArray.includes('ADMIN') ? 'pos,shifts,inventory,customers,expenses,reports,admin' : 'pos,shifts');
      const permissionsArray = rawPerms.split(',').map((p: string) => p.trim());

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            roles: rolesArray,
            permissions: permissionsArray,
            branchId: user.branchId,
            organizationId: user.organizationId,
            organizationName: user.organization.name,
            tagline: user.organization.tagline,
            taxNumber: user.organization.taxNumber,
            phone: user.organization.phone || user.branch?.phone,
            address: user.organization.address || user.branch?.address,
            website: (user.organization as any).website,
            logoUrl: user.organization.logoUrl,
            status: user.organization.status,
            branches: user.organization.branches.map(b => ({ id: b.id, name: b.name, code: b.code }))
          },
          token: `jwt-token-${user.id}`
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // List Branches
  static async getBranches(req: AuthenticatedRequest, res: Response) {
    try {
      const branches = await prisma.branch.findMany({
        where: req.user?.organizationId ? { organizationId: req.user.organizationId } : {},
        include: { registers: true, warehouses: true }
      });
      res.json({ success: true, data: branches });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Create Branch
  static async createBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, phone, address } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Branch name is required' });

      const count = await prisma.branch.count();
      const branchCode = `BR-${(count + 1).toString().padStart(3, '0')}`;

      const result = await prisma.$transaction(async (tx) => {
        const branch = await tx.branch.create({
          data: {
            organizationId: req.user!.organizationId || 'AVE-ORG-01',
            name,
            code: branchCode,
            phone: phone || null,
            address: address || null,
            status: 'ACTIVE'
          }
        });

        await tx.warehouse.create({
          data: {
            branchId: branch.id,
            name: `${branch.name} Warehouse`,
            code: `WH-${branchCode}`,
            isPrimary: true
          }
        });

        await tx.register.create({
          data: {
            branchId: branch.id,
            name: 'POS Terminal 01',
            code: `REG-${branchCode}-01`,
            isActive: true
          }
        });

        return branch;
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Update Branch
  static async updateBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, phone, address, status } = req.body;
      const branch = await prisma.branch.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(status && { status })
        }
      });
      res.json({ success: true, data: branch });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // List Users
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        where: req.user?.organizationId ? { organizationId: req.user.organizationId } : {},
        include: { branch: true }
      });

      const formatted = users.map((u: any) => {
        let rawRolesStr = u.roles || u.role;
        if (rawRolesStr === 'CASHIER' && u.role && u.role !== 'CASHIER') {
          if (u.role === 'OWNER') rawRolesStr = 'OWNER,ADMIN,CASHIER';
          else if (u.role === 'ADMIN') rawRolesStr = 'ADMIN,CASHIER';
          else if (u.role === 'MANAGER') rawRolesStr = 'MANAGER,SUPERVISOR,CASHIER';
        }
        const rolesArr = rawRolesStr.split(',');
        const permsStr = u.permissions || (rolesArr.includes('ADMIN') || rolesArr.includes('OWNER') ? 'pos,shifts,inventory,customers,expenses,reports,admin' : 'pos,shifts');
        return {
          ...u,
          roles: rolesArr,
          permissions: permsStr.split(',')
        };
      });

      res.json({ success: true, data: formatted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Create User (Staff)
  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, email, password, branchId, roles, permissions, phone } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'User with this email already exists' });
      }

      const rolesStr = Array.isArray(roles) ? roles.join(',') : (roles || 'CASHIER');
      const primaryRole = (rolesStr.split(',')[0] || 'CASHIER') as any;

      const permsStr = Array.isArray(permissions) 
        ? permissions.join(',') 
        : (permissions || (primaryRole === 'ADMIN' || primaryRole === 'OWNER' ? 'pos,shifts,inventory,customers,expenses,reports,admin' : 'pos,shifts'));

      const newUser = await prisma.user.create({
        data: {
          organizationId: req.user!.organizationId || 'AVE-ORG-01',
          branchId: branchId || req.user!.branchId,
          name,
          email,
          phone: phone || null,
          passwordHash: password,
          role: primaryRole,
          roles: rolesStr,
          permissions: permsStr,
          isActive: true
        } as any
      });

      res.status(201).json({
        success: true,
        data: {
          ...newUser,
          roles: rolesStr.split(','),
          permissions: permsStr.split(',')
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Update User
  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { roles, permissions, isActive, name, phone, branchId } = req.body;

      const dataToUpdate: any = {};
      if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;
      if (name) dataToUpdate.name = name;
      if (phone) dataToUpdate.phone = phone;
      if (branchId) dataToUpdate.branchId = branchId;
      if (roles) {
        const rolesStr = Array.isArray(roles) ? roles.join(',') : roles;
        dataToUpdate.roles = rolesStr;
        dataToUpdate.role = rolesStr.split(',')[0];
      }
      if (permissions) {
        dataToUpdate.permissions = Array.isArray(permissions) ? permissions.join(',') : permissions;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: dataToUpdate
      });

      res.json({
        success: true,
        data: {
          ...updated,
          roles: (updated.roles || updated.role).split(','),
          permissions: ((updated as any).permissions || 'pos,shifts').split(',')
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Delete Staff Account
  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.user!.organizationId;

      const userToDelete = await prisma.user.findUnique({ where: { id } });
      if (!userToDelete) {
        return res.status(404).json({ success: false, error: 'Staff account not found' });
      }

      if (userToDelete.organizationId !== orgId) {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot delete user from another organization' });
      }

      if (userToDelete.id === req.user!.id) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own active account.' });
      }

      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: `Staff account '${userToDelete.name}' deleted successfully.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Update Business Settings
  static async updateBusiness(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, tagline, taxNumber, phone, address, website, logoUrl, status } = req.body;
      const orgId = req.user!.organizationId;

      if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID not found' });

      const updated = await prisma.organization.update({
        where: { id: orgId },
        data: {
          ...(name && { name }),
          ...(tagline !== undefined && { tagline }),
          ...(taxNumber !== undefined && { taxNumber }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(website !== undefined && { website }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(status && { status })
        }
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Delete Business (Cascading Delete)
  static async deleteBusiness(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.user!.organizationId;
      if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID not found' });

      await prisma.organization.delete({
        where: { id: orgId }
      });

      res.json({ success: true, message: 'Business and all associated records deleted permanently.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Get Current User Profile
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
          branch: true
        }
      });

      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          roles: user.roles ? user.roles.split(',') : [user.role],
          permissions: ((user as any).permissions || 'pos,shifts').split(','),
          isActive: user.isActive,
          createdAt: user.createdAt,
          branch: user.branch,
          organization: user.organization
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Update Personal Profile (Name, Phone, Password)
  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { name, phone, password } = req.body;

      const dataToUpdate: any = {};
      if (name) dataToUpdate.name = name;
      if (phone !== undefined) dataToUpdate.phone = phone;
      if (password) dataToUpdate.passwordHash = password;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate
      });

      res.json({
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          phone: updated.phone,
          role: updated.role,
          roles: updated.roles ? updated.roles.split(',') : [updated.role],
          permissions: ((updated as any).permissions || 'pos,shifts').split(',')
        }
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
