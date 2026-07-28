import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UserRole } from '../users/entities/user.entity';
import { UpdateParametresDto } from './dto/update-parametres.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() { return this.adminService.getDashboard(); }

  @Get('users')
  findUsers(@Query('role') role?: UserRole) { return this.adminService.findUsers(role); }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) { return this.adminService.createUser(dto); }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteUser(id, req.user.userId);
  }

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
