import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CreneauxService } from './creneaux.service';
import { CreateCreneauDto } from './dto/create-creneau.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

// GET /boutiques/:boutiqueId/creneaux?jour=2026-07-22
@Controller('boutiques/:boutiqueId/creneaux')
export class CreneauxController {
  constructor(private readonly creneauxService: CreneauxService) {}

  @Get() findAll(@Param('boutiqueId') boutiqueId: string, @Query('jour') jour?: string) {
    return this.creneauxService.findByBoutique(boutiqueId, jour);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMMERCANT, UserRole.ADMINISTRATEUR)
  @Post() create(@Param('boutiqueId') boutiqueId: string, @Body() dto: CreateCreneauDto, @Request() req) {
    return this.creneauxService.create(boutiqueId, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id') remove(@Param('id') id: string, @Request() req) {
    return this.creneauxService.remove(id, req.user.userId, req.user.role);
  }
}