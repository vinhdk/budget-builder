import {
  Directive,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[avnonHandler]',
  standalone: true,
})
export class SAOInputHandlerDirective {
  public readonly enterEvent = output();
  public readonly isNumber = input<boolean>(false);
  public readonly focus = model<boolean>(false);
  public readonly control = inject(NgControl, { optional: true });
  public readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  public constructor() {
    effect(() => {
      if (this.focus()) {
        this.elementRef.nativeElement.readOnly = false;
        this.elementRef.nativeElement.focus();
      } else {
        this.elementRef.nativeElement.readOnly = true;
      }
    });
  }

  @HostListener('dblclick', ['$event'])
  public doubleClick(): void {
    this.focus.set(true);
  }

  @HostListener('blur')
  public blur(): void {
    this.focus.set(false);
  }

  @HostListener('keydown', ['$event'])
  public keydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.__enterHandler();
      return;
    }

    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      this.__arrowHandler(event);
      return;
    }

    if (event.key === 'Escape') {
      this.focus.set(false);
      return;
    }

    if (!this.focus()) {
      this.__keyHandler(event);
      return;
    }
  }

  private __keyHandler(event: KeyboardEvent): void {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.elementRef.nativeElement.value = '';
      this.focus.set(true);
      this.control?.control?.markAsTouched();
      this.control?.control?.markAsDirty();
      this.control?.control?.setValue(null);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'c') {
        navigator.clipboard
          .writeText(this.elementRef.nativeElement.value)
          .then(() => {
            console.log('copied');
          });
        return;
      } else if (event.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then(text => {
          if (this.isNumber() && isNaN(Number(text))) {
            return;
          }
          this.elementRef.nativeElement.value = text;
        });
        return;
      }
      return;
    }

    const regex = (
      this.isNumber() ? new RegExp(/^(?:[0-9]+|\.)$/) : /^[a-zA-Z0-9]$/
    ).test(event.key);

    if (regex) {
      this.focus.set(true);
      this.elementRef.nativeElement.value = event.key;
    }
  }

  private __enterHandler(): void {
    if (this.focus()) {
      this.enterEvent.emit();
    } else {
      this.focus.set(true);
    }
  }

  private __arrowHandler(event: KeyboardEvent): void {
    if (this.focus()) {
      return;
    }

    const table = this.elementRef.nativeElement.closest(
      'table'
    ) as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tr'));
    const rowInputs = rows.map(row =>
      Array.from(row.querySelectorAll('input'))
    );
    const currentRowIndex = rowInputs.findIndex(row =>
      row.includes(this.elementRef.nativeElement)
    );
    const currentColIndex = rowInputs[currentRowIndex].indexOf(
      this.elementRef.nativeElement
    );

    let targetInput: HTMLInputElement | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        if (currentColIndex > 0) {
          targetInput = rowInputs[currentRowIndex][currentColIndex - 1];
        } else {
          for (let i = currentRowIndex - 1; i >= 0; i--) {
            if (rowInputs[i].length > 0) {
              targetInput = rowInputs[i][rowInputs[i].length - 1];
              break;
            }
          }
        }
        break;
      case 'ArrowRight':
        if (currentColIndex < rowInputs[currentRowIndex].length - 1) {
          targetInput = rowInputs[currentRowIndex][currentColIndex + 1];
        } else {
          for (let i = currentRowIndex + 1; i < rowInputs.length; i++) {
            if (rowInputs[i].length > 0) {
              targetInput = rowInputs[i][0];
              break;
            }
          }
        }
        break;
      case 'ArrowUp':
        for (let i = currentRowIndex - 1; i >= 0; i--) {
          if (rowInputs[i][currentColIndex]) {
            targetInput = rowInputs[i][currentColIndex];
            break;
          }
        }
        break;
      case 'ArrowDown':
        for (let i = currentRowIndex + 1; i < rowInputs.length; i++) {
          if (rowInputs[i][currentColIndex]) {
            targetInput = rowInputs[i][currentColIndex];
            break;
          }
        }
        break;
    }

    if (targetInput) {
      targetInput.focus();
      event.preventDefault();
    }
  }
}
