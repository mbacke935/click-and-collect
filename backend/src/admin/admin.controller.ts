import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() { return this.adminService.getDashboard(); }

  @Get('users')
  findUsers(@Query('role') role?: UserRole) { return this.adminService.findUsers(role); }

  @Get('boutiques')
  findBoutiques() { return this.adminService.findAllBoutiques(); }

  @Patch('boutiques/:id/toggle')
  toggleBoutique(@Param('id') id: string, @Query('active') active: string) {
    return this.adminService.toggleBoutique(id, active === 'true');
  }

  @Get('commandes')
  findCommandes(@Query('statut') statut?: string) { return this.adminService.findAllCommandes(statut); }
}
