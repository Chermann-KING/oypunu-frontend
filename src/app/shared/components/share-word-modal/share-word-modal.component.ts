import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-share-word-modal',
  standalone: false,
  templateUrl: './share-word-modal.component.html',
  styleUrls: ['./share-word-modal.component.scss'],
})
export class ShareWordModalComponent {
  @Input() isOpen = false;
  @Input() wordId = '';
  @Output() close = new EventEmitter<void>();
  @Output() share = new EventEmitter<string>();

  shareForm: FormGroup;

  constructor(private _fb: FormBuilder) {
    this.shareForm = this._fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  onSubmit(): void {
    if (this.shareForm.valid) {
      this.share.emit(this.shareForm.get('username')?.value);
      this.shareForm.reset();
    }
  }

  onClose(): void {
    this.close.emit();
    this.shareForm.reset();
  }
}
