import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { PaniersService } from './paniers.service';
import { AjouterArticleDto } from './dto/ajouter-article.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('boutiques/:boutiqueId/panier')
export class PaniersController {
  constructor(private readonly paniersService: PaniersService) {}

  @Get()
  getPanier(@Param('boutiqueId') boutiqueId: string, @Request() req) {
    return this.paniersService.getOrCreate(req.user.userId, boutiqueId);
  }

  @Post('articles')
  ajouterArticle(@Param('boutiqueId') boutiqueId: string, @Body() dto: AjouterArticleDto, @Request() req) {
    return this.paniersService.ajouterArticle(req.user.userId, boutiqueId, dto);
  }

  @Patch('articles/:ligneId')
  modifierQuantite(@Param('ligneId') ligneId: string, @Body('quantite') quantite: number, @Request() req) {
    return this.paniersService.modifierQuantite(ligneId, quantite, req.user.userId);
  }

  @Delete('articles/:ligneId')
  supprimerLigne(@Param('ligneId') ligneId: string, @Request() req) {
    return this.paniersService.supprimerLigne(ligneId, req.user.userId);
  }

  @Delete(':panierId')
  vider(@Param('panierId') panierId: string, @Request() req) {
    return this.paniersService.vider(panierId, req.user.userId);
  }
}
