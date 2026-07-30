import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ProduitsService } from './produits.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('boutiques/:boutiqueId/produits')
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  @Get()
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.produitsService.findByBoutique(boutiqueId);
  }

  // Déclarée avant @Get(':id') : NestJS fait correspondre les routes dans l'ordre de
  // déclaration, un segment littéral doit donc précéder un paramètre générique pour ne
  // pas être avalé par celui-ci.
  @UseGuards(JwtAuthGuard)
  @Get('gestion')
  findAllPourGestion(@Param('boutiqueId') boutiqueId: string, @Request() req) {
    return this.produitsService.findByBoutiqueForUser(boutiqueId, req.user.userId, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMMERCANT, UserRole.ADMINISTRATEUR)
  @Post()
  create(@Param('boutiqueId') boutiqueId: string, @Body() dto: CreateProduitDto, @Request() req) {
    return this.produitsService.create(boutiqueId, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProduitDto, @Request() req) {
    return this.produitsService.update(id, dto, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  desactiver(@Param('id') id: string, @Request() req) {
    return this.produitsService.desactiver(id, req.user.userId, req.user.role);
  }
}
