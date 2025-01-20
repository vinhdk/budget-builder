import { FormArray, FormControl, FormGroup } from '@angular/forms';
import Dexie, { Table } from 'dexie';
import { Parts } from '../enums';
import {
  BuilderCategory,
  BuilderCategoryFormGroup,
  BuilderControl,
  BuilderControlFormGroup,
  BuilderGroup,
  BuilderGroupFormGroup,
  BuilderGroupFormGroupMain,
  BuilderPartFormArray,
} from '../types';

export const BuilderDatabaseName = 'avnonBuilder';

export class BuilderDatabase extends Dexie {
  public readonly builderControl!: Table<BuilderControl, number>;
  public readonly builderGroup!: Table<BuilderGroup, number>;
  public readonly builderCategory!: Table<BuilderCategory, number>;

  public constructor() {
    super(BuilderDatabaseName);
    this.version(1).stores({
      builderControl: '++id, label, start, end',
      builderGroup: '++id, main, part',
      builderCategory: '++id, label, months, group',
    });
  }
}

export const builderDatabaseObject = new BuilderDatabase();

/**
 * @async
 * @description Create a new builder control and patch value from database
 * @param {BuilderControlFormGroup | undefined} formGroup - Optional form group
 * @returns {Promise<BuilderControlFormGroup>}
 * @example
 * ```ts
 * const formGroup = await createOrUpdateBuilderControlAsync();
 * ```
 */
export async function createOrUpdateBuilderControlAsync(
  formGroup?: BuilderControlFormGroup
): Promise<BuilderControlFormGroup> {
  formGroup =
    /* To set default formGroup if not provided */ formGroup ??
    new FormGroup<BuilderControlFormGroup['controls']>({
      label: new FormControl<string>('Budget Builder', { nonNullable: true }),
      start: new FormControl<string>('2024-01', { nonNullable: true }),
      end: new FormControl<string>('2024-12', { nonNullable: true }),
    });

  /* Get the first builder control from database */
  const builderControl = await builderDatabaseObject.builderControl
    .toArray()
    .then(controls => controls[0]);

  formGroup.patchValue({
    label: builderControl.label ?? 'Avnon Budget Builder',
    start: builderControl.start ?? '2024-01',
    end: builderControl.end ?? '2024-12',
  });

  return formGroup;
}

/**
 * @async
 * @description Create a new builder part and patch value from database
 * @param {Parts} part - The part
 * @param {BuilderPartFormArray | undefined} formArray - Optional form array
 * @returns {Promise<BuilderPartFormArray>}
 * @example
 * ```ts
 * const formArray = await createOrUpdateBuilderPartAsync(Parts.Income);
 * ```
 */
export async function createOrUpdateBuilderPartAsync(
  part: Parts,
  formArray?: BuilderPartFormArray
): Promise<BuilderPartFormArray> {
  formArray =
    /* To set default formArray if not provided */ formArray ??
    new FormArray<BuilderGroupFormGroup>([]);
  formArray.clear();

  /* 1. Get the builder groups from database by part */
  const builderGroups = await builderDatabaseObject.builderGroup
    .filter(builderGroup => builderGroup.part === part)
    .toArray();

  /* 2. Create a new builder group for each builder group by passing value and part -> push to form array */
  for (const builderGroup of builderGroups) {
    const formGroup = await createOrUpdateBuilderGroupAsync(builderGroup, part);
    formArray.push(formGroup);
  }

  return formArray;
}

/**
 * @async
 * @description Create a new builder group and patch value from database
 * @param {BuilderGroup} value - The builder group
 * @param {Parts} part - The part
 * @param {BuilderGroupFormGroup | undefined} formGroup - Optional form group
 * @returns {Promise<BuilderGroupFormGroup>}
 * @example
 * ```ts
 * const formGroup = await createOrUpdateBuilderGroupAsync(group, Parts.Income);
 * ```
 */
export async function createOrUpdateBuilderGroupAsync(
  value: BuilderGroup,
  part: Parts,
  formGroup?: BuilderGroupFormGroup
): Promise<BuilderGroupFormGroup> {
  formGroup =
    /* To set default formGroup if not provided */ formGroup ??
    new FormGroup<BuilderGroupFormGroup['controls']>({
      main: new FormGroup<BuilderGroupFormGroupMain['controls']>({
        label: new FormControl<string>('Main', { nonNullable: true }),
        months: new FormArray<FormControl<number>>([]),
      }),
      categories: new FormArray<BuilderCategoryFormGroup>([]),
      part: new FormControl<Parts>(part, { nonNullable: true }),
    });

  /* 1. Patch default value to form group */
  formGroup.patchValue({
    main: {
      label: value.main.label ?? '',
    },
    part,
  });

  /* 2. Get the builder categories from database by builder group's id */
  const categories = await builderDatabaseObject.builderCategory
    .filter(builderCategory => builderCategory.group === value.id)
    .toArray();

  /* 3. Create a new builder category for each builder category by passing value */
  for (const category of categories) {
    const categoryGroup = await createOrUpdateBuilderCategoryAsync(category);
    formGroup.controls.categories.push(categoryGroup);
  }

  /* 4. Patch value to main months form array */
  await createOrUpdateBuilderMonthsAsync(
    value.main.months,
    formGroup.controls.main.controls.months
  );

  return formGroup;
}

/**
 * @async
 * @description Create a new builder category and patch value from database
 * @param {BuilderCategory} value - The builder category
 * @param {BuilderCategoryFormGroup | undefined} formGroup - Optional form group
 * @returns {Promise<BuilderCategoryFormGroup>}
 * @example
 * ```ts
 * const formGroup = await createOrUpdateBuilderCategoryAsync(category);
 * ```
 */
export async function createOrUpdateBuilderCategoryAsync(
  value: BuilderCategory,
  formGroup?: BuilderCategoryFormGroup
): Promise<BuilderCategoryFormGroup> {
  formGroup =
    /* To set default formGroup if not provided */ formGroup ??
    new FormGroup<BuilderCategoryFormGroup['controls']>({
      label: new FormControl<string>('', { nonNullable: true }),
      months: new FormArray<FormControl<number>>([]),
    });

  /* 1. Patch default value to form group */
  formGroup.patchValue({
    label: value.label ?? '',
  });

  /* 2. Patch value to months form array */
  await createOrUpdateBuilderMonthsAsync(
    value.months,
    formGroup.controls.months
  );

  return formGroup;
}

/**
 * @async
 * @description Create a new builder months and patch value from database
 * @param {number[]} value - The builder months
 * @param {FormArray<FormControl<number>> | undefined} formArray - Optional form array
 * @returns {Promise<FormArray<FormControl<number>>>}
 * @example
 * ```ts
 * const formArray = await createOrUpdateBuilderMonthsAsync(months);
 * ```
 */
export async function createOrUpdateBuilderMonthsAsync(
  value: number[],
  formArray?: FormArray<FormControl<number>>
): Promise<FormArray<FormControl<number>>> {
  formArray =
    /* To set default formArray if not provided */ formArray ??
    new FormArray<FormControl<number>>([]);
  formArray.clear();

  /* 1. Get the gap between the start and end date -> compare with the length of the value */
  const gap = await getMonthGapAsync();
  value =
    gap !== value.length ? Array.from({ length: gap }).map(() => 0) : value;

  /* 2. Create a new form control for each value and push to form array */
  for (const month of value) {
    formArray.push(new FormControl<number>(month, { nonNullable: true }));
  }

  return formArray;
}

/**
 * @async
 * @description Get the gap between the start and end date
 * @returns {Promise<number>}
 * @example
 * ```ts
 * const gap = await getMonthGapAsync();
 * ```
 */
export async function getMonthGapAsync(): Promise<number> {
  /* 1. Get the builder control from database */
  const controlGroup = await createOrUpdateBuilderControlAsync();

  /* 2. Get the start and end date */
  const start = new Date(controlGroup.controls.start.value || '2024-01');
  const end = new Date(
    controlGroup.controls.end.value || `${start.getFullYear()}-12`
  );

  return calculateTotalMonths(end) - calculateTotalMonths(start) + 1;
}

/**
 * @async
 * @description Calculate the gap between the start and end date
 * - 1. Subtract 1 from the full year then multiply by 12 to get full months until last year
 * - 2. Plus the current months of year to get the total months
 * @param {Date} date - The start date
 * @returns {number}
 */
export function calculateTotalMonths(date: Date): number {
  return (date.getFullYear() - 1) * 12 + date.getMonth();
}

/**
 * @async
 * @description Calculate months between the start and end date
 * @param {Date} start - The start date
 * @param {Date} end - The end date
 * @returns {Date[]}
 */
export function calculateMonths(start: Date, end: Date): Date[] {
  const months = [];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      if (
        (year === startYear && month < startMonth) ||
        (year === endYear && month > endMonth)
      ) {
        continue;
      }

      months.push(new Date(year, month));
    }
  }

  return months;
}

/**
 * @async
 * @description Mock the database
 * @returns {Promise<void>}
 */
export async function mockAsync(): Promise<void> {
  await builderDatabaseObject.builderControl.clear();
  await builderDatabaseObject.builderGroup.clear();
  await builderDatabaseObject.builderCategory.clear();

  await builderDatabaseObject.builderControl.add({
    label: 'Budget Builder',
    start: '2024-01',
    end: '2024-12',
  });

  await builderDatabaseObject.builderGroup.bulkAdd([
    {
      id: 1,
      main: {
        label: 'General Income',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
      },
      part: Parts.Income,
    },
    {
      id: 2,
      main: {
        label: 'Other Income',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
      },
      part: Parts.Income,
    },
    {
      id: 3,
      main: {
        label: 'Operational Expenses',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
      },
      part: Parts.Expenses,
    },
    {
      id: 4,
      main: {
        label: 'Salaries & Wages',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
      },
      part: Parts.Expenses,
    },
  ]);

  await builderDatabaseObject.builderCategory.bulkAdd([
    ...[
      {
        label: 'Sales',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 1,
      },
      {
        label: 'Commission',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 1,
      },
    ],
    ...[
      {
        label: 'Training',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 2,
      },
      {
        label: 'Consulting',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 2,
      },
    ],
    ...[
      {
        label: 'Management Fees',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 3,
      },
      {
        label: 'Cloud Hosting',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 3,
      },
    ],
    ...[
      {
        label: 'Full Time Dev Salaries',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 4,
      },
      {
        label: 'Part Time Dev Salaries',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 4,
      },
      {
        label: 'Remote Salaries',
        months: [100, 120, 100, 120, 100, 120, 100, 120, 100, 120, 100, 120],
        group: 4,
      },
    ],
  ]);
}

/**
 * @async
 * @description Refresh the database
 * @returns {Promise<void>}
 */
export async function refreshAsync(): Promise<void> {
  await builderDatabaseObject.builderCategory.clear();
  await builderDatabaseObject.builderControl.clear();
  await builderDatabaseObject.builderGroup.clear();
}

/**
 * @async
 * @description Save Control to database
 * @param {BuilderControlFormGroup['value']} control
 * @returns {Promise<void>}
 */
export async function saveControlAsync(
  control: BuilderControlFormGroup['value']
): Promise<void> {
  await builderDatabaseObject.builderControl.add(control as BuilderControl);
}

/**
 * @async
 * @description Save Part's groups to database
 * @param {BuilderPartFormArray['value']} value
 * @param {Parts} part
 * @returns {Promise<void>}
 */
export async function savePartAsync(
  value: BuilderPartFormArray['value'],
  part: Parts
): Promise<void> {
  for (const item of value) {
    await saveGroupAsync(item as BuilderGroupFormGroup['value'], part);
  }
}

/**
 * @async
 * @description Save Group to database
 * @param {BuilderGroupFormGroup['value']} group
 * @param {Parts} part
 * @returns {Promise<void>}
 */
export async function saveGroupAsync(
  group: BuilderGroupFormGroup['value'],
  part: Parts
): Promise<void> {
  const id = await builderDatabaseObject.builderGroup.add({
    part,
    main: group.main as Omit<BuilderCategory, 'id' | 'group'>,
  });

  for (const category of group.categories as BuilderCategoryFormGroup['value'][]) {
    await saveCategoryAsync(category, id);
  }
}

/**
 * @async
 * @description Save Category to database
 * @param {BuilderCategoryFormGroup['value']} category
 * @param {number} group
 * @returns {Promise<void>}
 */
export async function saveCategoryAsync(
  category: BuilderCategoryFormGroup['value'],
  group: number
): Promise<void> {
  await builderDatabaseObject.builderCategory.add({
    ...category,
    group,
  } as BuilderCategory);
}
