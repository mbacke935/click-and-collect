import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ProduitsService } from './produits.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('boutiques/:boutiqueId/produits')
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  @Get()
  findAll(@Param('boutiqueId') boutiqueId: string) {
    return this.produitsService.findByBoutique(boutiqueId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produitsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
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
  remove(@Param('id') id: string, @Request() req) {
    return this.produitsService.remove(id, req.user.userId, req.user.role);
  }
}
