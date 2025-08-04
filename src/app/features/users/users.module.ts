import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { UsersService } from './services/users.service';

/**
 * Module Users pour O'Ypunu
 * 
 * Ce module centralise toutes les fonctionnalités liées aux utilisateurs :
 * - Gestion de profil
 * - Recherche d'utilisateurs
 * - Statistiques et analytics
 * - Contributions et consultations
 */
@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  providers: [
    UsersService
  ]
})
export class UsersModule { }