import { Pipe, PipeTransform } from '@angular/core';
import { FormArray } from '@angular/forms';
import { BuilderGroupFormGroup } from '../types';
import { SAOPartTotalPipe } from './part-total.pipe';

@Pipe({
  name: 'avnonProfitAndLoss',
  standalone: true,
})
export class SAOProfitAndLossPipe implements PipeTransform {
  public transform(
    parts: FormArray<BuilderGroupFormGroup>['value'][]
  ): number[] {
    const partPipe = new SAOPartTotalPipe();
    return this.__sum(parts.map(part => partPipe.transform(part)));
  }

  private __sum(values: number[][]): number[] {
    return values.reduce((acc, value) => {
      value.forEach((month, index) => {
        const checkedMonth = isNaN(month) ? 0 : month;
        if (acc[index] != null) {
          acc[index] -= checkedMonth;
        } else {
          acc.push(checkedMonth);
        }
      });
      return acc;
    }, []);
  }
}
