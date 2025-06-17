import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  forwardRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-custom-dropdown',
  standalone: false,
  templateUrl: './custom-dropdown.component.html',
  styleUrls: ['./custom-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDropdownComponent),
      multi: true,
    },
  ],
})
export class CustomDropdownComponent implements ControlValueAccessor {
  @Input() options: DropdownOption[] = [];
  @Input() label: string = '';
  @Input() multiple: boolean = false;
  @Input() placeholder: string = 'Sélectionner...';
  @Input() closeOnSelect: boolean = true; // Propriété pour contrôler si la dropdown se ferme à la sélection
  @Output() selectionChange = new EventEmitter<string[]>();

  isOpen: boolean = false;
  selectedValues: string[] = [];

  constructor(private elementRef: ElementRef) {}

  // Implémenter ControlValueAccessor
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.selectedValues = [];
    } else if (Array.isArray(value)) {
      this.selectedValues = [...value];
    } else {
      this.selectedValues = [value];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implémentation pour désactiver le composant si nécessaire
  }

  // Méthodes pour le dropdown
  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
  }

  toggleOption(value: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.multiple) {
      const index = this.selectedValues.indexOf(value);
      if (index === -1) {
        this.selectedValues = [...this.selectedValues, value];
      } else {
        this.selectedValues = this.selectedValues.filter((v) => v !== value);
      }

      // Fermer la dropdown si l'option closeOnSelect est true, même en mode multiple
      if (this.closeOnSelect) {
        this.isOpen = false;
      }
    } else {
      this.selectedValues = [value];
      // En mode simple sélection, toujours fermer
      this.isOpen = false;
    }

    this.onChange(this.multiple ? this.selectedValues : this.selectedValues[0]);
    this.selectionChange.emit(this.selectedValues);
  }

  isSelected(value: string): boolean {
    return this.selectedValues.includes(value);
  }

  getSelectedLabels(): string {
    if (this.selectedValues.length === 0) {
      return this.placeholder;
    }

    return this.selectedValues
      .map((v) => this.options.find((opt) => opt.value === v)?.label || v)
      .join(', ');
  }

  // Détecter les clics en dehors du dropdown pour le fermer
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target) && this.isOpen) {
      this.isOpen = false;
    }
  }

  // Empêcher la propagation du clic dans le dropdown pour éviter de le fermer
  onDropdownClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
