import { Pipe, PipeTransform } from '@angular/core';
import { FormArray } from '@angular/forms';
import { BuilderGroupFormGroup } from '../types';
import { SAOCategoryTotalPipe } from './category-total.pipe';

@Pipe({
  name: 'avnonPartTotal',
  standalone: true,
})
export class SAOPartTotalPipe implements PipeTransform {
  public transform(
    groups: FormArray<BuilderGroupFormGroup>['value']
  ): number[] {
    const categoryPipe = new SAOCategoryTotalPipe();
    return this.__sum(groups.map(group => categoryPipe.transform(group)));
  }

  private __sum(values: number[][]): number[] {
    return values.reduce((acc, value) => {
      value.forEach((month, index) => {
        if (acc[index] != null) {
          acc[index] += month;
        } else {
          acc.push(month);
        }
      });
      return acc;
    }, []);
  }
}
