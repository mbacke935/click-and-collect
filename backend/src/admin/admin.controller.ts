import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserRole } from '../users/entities/user.entity';
import { UpdateParametresDto } from './dto/update-parametres.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() { return this.adminService.getDashboard(); }

  @Get('users')
  findUsers(@Query('role') role?: UserRole) { return this.adminService.findUsers(role); }

  @Patch('users/:id/toggle')
  toggleUser(@Param('id') id: string, @Query('active') active: string) {
    return this.adminService.toggleUser(id, active === 'true');
  }

  @Get('boutiques')
  findBoutiques() { return this.adminService.findAllBoutiques(); }

  @Patch('boutiques/:id/toggle')
  toggleBoutique(@Param('id') id: string, @Query('active') active: string) {
    return this.adminService.toggleBoutique(id, active === 'true');
  }

  @Get('commandes')
  findCommandes(@Query('statut') statut?: string) { return this.adminService.findAllCommandes(statut); }

  @Get('produits')
  findProduits() { return this.adminService.findAllProduits(); }

  @Patch('produits/:id/toggle')
  toggleProduit(@Param('id') id: string, @Query('active') active: string) {
    return this.adminService.toggleProduit(id, active === 'true');
  }

  @Get('parametres')
  getParametres() { return this.adminService.getParametres(); }

  @Patch('parametres')
  updateParametres(@Body() dto: UpdateParametresDto) { return this.adminService.updateParametres(dto); }
}
