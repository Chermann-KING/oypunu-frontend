import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { LogoComponent } from './components/logo/logo.component';
import { MainNavComponent } from './components/main-nav/main-nav.component';
import { ProfileComponent } from './components/profile/profile.component';
import { CustomDropdownComponent } from './components/custom-dropdown/custom-dropdown.component';
import { CapitalizePipe } from '../pipes/capitalize.pipe';
import { WordCardComponent } from './components/word-card/word-card.component';
import { ShareWordModalComponent } from './components/share-word-modal/share-word-modal.component';

@NgModule({
  declarations: [
    HeaderComponent,
    FooterComponent,
    LogoComponent,
    MainNavComponent,
    ProfileComponent,
    CustomDropdownComponent,
    WordCardComponent,
    CapitalizePipe,
    ShareWordModalComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HeaderComponent,
    FooterComponent,
    CustomDropdownComponent,
    WordCardComponent,
    CapitalizePipe,
    ShareWordModalComponent,
  ],
})
export class SharedModule {}
