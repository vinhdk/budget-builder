import { DestroyRef, inject, Pipe, PipeTransform } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray } from '@angular/forms';
import { tap } from 'rxjs';
import { SafeAny } from '../types';

@Pipe({
  name: 'avnonFormArrayControl',
  pure: false,
  standalone: true,
})
export class SAOFormArrayControlDirective implements PipeTransform {
  public readonly destroyRef = inject(DestroyRef);

  public transform<T extends FormArray<SafeAny>>(formArray: T): T['controls'] {
    let controls = [...formArray.controls];

    formArray.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => (controls = [...formArray.controls]))
      )
      .subscribe();

    return controls;
  }
}
