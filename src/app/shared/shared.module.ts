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
import { AudioRecorderComponent } from './components/audio-recorder/audio-recorder.component';
import { TranslationWidgetComponent } from './components/translation-widget/translation-widget.component';
import { WordTranslationsComponent } from './components/word-translations/word-translations.component';
import { RevisionHistoryComponent } from './components/revision-history/revision-history.component';
import { WordStatusBadgeComponent } from './components/word-status-badge/word-status-badge.component';
import { GuestLimitsBadgeComponent } from './components/guest-limits-badge/guest-limits-badge.component';
import { SignupPromptModalComponent } from './components/signup-prompt-modal/signup-prompt-modal.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { LanguageAutocompleteComponent } from './components/language-autocomplete/language-autocomplete.component';
// import { IntelligentRecommendationsComponent } from './components/intelligent-recommendations/intelligent-recommendations.component';

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
    AudioRecorderComponent,
    TranslationWidgetComponent,
    WordTranslationsComponent,
    RevisionHistoryComponent,
    WordStatusBadgeComponent,
    GuestLimitsBadgeComponent,
    SignupPromptModalComponent,
    ToastContainerComponent,
    LanguageAutocompleteComponent,
    // IntelligentRecommendationsComponent,
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
    TranslationWidgetComponent,
    WordTranslationsComponent,
    RevisionHistoryComponent,
    WordStatusBadgeComponent,
    GuestLimitsBadgeComponent,
    SignupPromptModalComponent,
    ToastContainerComponent,
    LanguageAutocompleteComponent,
    // IntelligentRecommendationsComponent,
  ],
})
export class SharedModule {}
