import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LanguagesService, Language } from '../../../core/services/languages.service';

@Component({
  selector: 'app-language-autocomplete',
  standalone: false,
  templateUrl: './language-autocomplete.component.html',
  styleUrls: ['./language-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LanguageAutocompleteComponent),
      multi: true
    }
  ]
})
export class LanguageAutocompleteComponent implements OnInit, ControlValueAccessor {
  @Input() placeholder: string = 'Sélectionnez ou tapez une langue...';
  @Input() disabled: boolean = false;
  @Output() languageSelected = new EventEmitter<Language>();

  searchTerm: string = '';
  languages: Language[] = [];
  filteredLanguages: Language[] = [];
  showDropdown: boolean = false;
  selectedLanguage: Language | null = null;
  isLoading: boolean = false;

  private onChange = (value: any) => {};
  private onTouched = () => {};

  constructor(private languagesService: LanguagesService) {}

  ngOnInit(): void {
    this.loadLanguages();
  }

  private loadLanguages(): void {
    this.isLoading = true;
    this.languagesService.getActiveLanguages().subscribe({
      next: (languages) => {
        this.languages = languages;
        this.filteredLanguages = languages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des langues:', error);
        this.isLoading = false;
      }
    });
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filterLanguages();
    this.showDropdown = this.searchTerm.length > 0;
    this.onTouched();
  }

  onInputFocus(): void {
    if (this.searchTerm.length > 0 || this.filteredLanguages.length > 0) {
      this.showDropdown = true;
    }
  }

  onInputBlur(): void {
    // Délai pour permettre le clic sur une option
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  trackByLanguage(index: number, language: Language): string {
    return language._id;
  }

  private filterLanguages(): void {
    if (!this.searchTerm.trim()) {
      this.filteredLanguages = this.languages.slice(0, 10); // Limite à 10 résultats
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredLanguages = this.languages
      .filter(language => 
        language.name.toLowerCase().includes(searchLower) ||
        language.nativeName?.toLowerCase().includes(searchLower) ||
        language.iso639_1?.toLowerCase().includes(searchLower) ||
        language.iso639_2?.toLowerCase().includes(searchLower)
      )
      .slice(0, 10); // Limite à 10 résultats
  }

  selectLanguage(language: Language): void {
    this.selectedLanguage = language;
    this.searchTerm = language.name;
    this.showDropdown = false;
    this.languageSelected.emit(language);
    this.onChange(language._id);
  }

  clearSelection(): void {
    this.selectedLanguage = null;
    this.searchTerm = '';
    this.filteredLanguages = this.languages.slice(0, 10);
    this.onChange(null);
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    if (value) {
      const language = this.languages.find(lang => lang._id === value);
      if (language) {
        this.selectedLanguage = language;
        this.searchTerm = language.name;
      }
    } else {
      this.clearSelection();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}