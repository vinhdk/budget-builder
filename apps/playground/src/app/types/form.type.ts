import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Parts } from '../enums';

export type BuilderPartFormArray = FormArray<BuilderGroupFormGroup>;

export type BuilderGroupFormGroup = FormGroup<{
  id?: FormControl<number>;
  main: BuilderGroupFormGroupMain;
  categories: FormArray<BuilderCategoryFormGroup>;
  part: FormControl<Parts>;
}>;

export type BuilderGroupFormGroupMain = FormGroup<{
  label: FormControl<string>;
  months: FormArray<FormControl<number>>;
}>;

export type BuilderCategoryFormGroup = FormGroup<{
  label: FormControl<string>;
  months: FormArray<FormControl<number>>;
}>;

export type BuilderControlFormGroup = FormGroup<{
  label: FormControl<string>;
  start: FormControl<string>;
  end: FormControl<string>;
}>;
