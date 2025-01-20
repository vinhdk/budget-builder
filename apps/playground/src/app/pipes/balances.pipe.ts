import { Pipe, PipeTransform } from '@angular/core';
import { FormArray } from '@angular/forms';
import { BuilderGroupFormGroup } from '../types';
import { SAOPartTotalPipe } from './part-total.pipe';

@Pipe({
  name: 'avnonBalances',
  standalone: true,
})
export class SAOBalancesPipe implements PipeTransform {
  public transform(parts: FormArray<BuilderGroupFormGroup>['value'][]): {
    opening: number[];
    closing: number[];
  } {
    const partPipe = new SAOPartTotalPipe();
    return this.__sum(parts.map(part => partPipe.transform(part))).reduce(
      (acc, value) => {
        acc.opening.push(value.opening);
        acc.closing.push(value.closing);
        return acc;
      },
      { opening: [] as number[], closing: [] as number[] }
    );
  }

  private __sum(parts: number[][]): { opening: number; closing: number }[] {
    const [income, expenses] = parts;
    const result = [] as { opening: number; closing: number }[];

    for (let i = 0; i < income.length; i++) {
      const item = { opening: 0, closing: 0 };

      item.opening = result[i - 1] != null ? result[i - 1].closing : 0;
      item.closing = item.opening + income[i] - expenses[i];

      result.push(item);
    }

    return result;
  }
}
