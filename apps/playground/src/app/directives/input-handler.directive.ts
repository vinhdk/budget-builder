import {
  Directive,
  effect,
  ElementRef,
  HostListener,
  inject,
  model,
  output,
} from '@angular/core';

@Directive({
  selector: 'input[avnonHandler]',
  standalone: true,
})
export class SAOInputHandlerDirective {
  public readonly enterEvent = output();
  public readonly focus = model<boolean>(false);
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

    if (!this.focus() && /^[a-zA-Z0-9]$/.test(event.key)) {
      this.focus.set(true);
      return;
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
