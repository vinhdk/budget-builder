import { Pipe, PipeTransform } from '@angular/core';
import { BuilderCategory, BuilderGroupFormGroup } from '../types';

@Pipe({
  name: 'avnonCategoryTotal',
  standalone: true,
})
export class SAOCategoryTotalPipe implements PipeTransform {
  public transform(group: BuilderGroupFormGroup['value']): number[] {
    return this.__sum([
      (group.main as BuilderCategory).months,
      ...(group.categories as BuilderCategory[]).map(
        category => category.months
      ),
    ]);
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
