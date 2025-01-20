import { Pipe, PipeTransform } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { SafeAny } from '../types';

@Pipe({
  name: 'avnonFormError',
  pure: false,
  standalone: true,
})
export class SAOFormErrorDirective implements PipeTransform {
  public transform(control: AbstractControl<SafeAny>): boolean {
    return (control.dirty || control.touched) && control.invalid;
  }
}
