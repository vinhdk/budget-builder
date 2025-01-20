import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  SAOAvatarDirective,
  SAOButtonDirective,
  SAOControlDirective,
  SAOIconDirective,
  SAOInputDirective,
  SAOTableDirective,
  SAOTableHeaderComponent,
} from '@sao-components/angular';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  race,
  startWith,
  tap,
} from 'rxjs';
import {
  calculateMonths,
  createOrUpdateBuilderControlAsync,
  createOrUpdateBuilderPartAsync,
  mockAsync,
  refreshAsync,
  saveControlAsync,
  savePartAsync,
} from './databases';
import { SAOInputHandlerDirective } from './directives';
import { Parts } from './enums';
import {
  SAOBalancesPipe,
  SAOCategoryTotalPipe,
  SAOFormArrayControlDirective,
  SAOFormErrorDirective,
  SAOPartTotalPipe,
  SAOProfitAndLossPipe,
} from './pipes';
import {
  BuilderCategoryFormGroup,
  BuilderControlFormGroup,
  BuilderGroupFormGroup,
  BuilderGroupFormGroupMain,
  BuilderPartFormArray,
} from './types';

@Component({
  selector: 'avnon-root',
  templateUrl: './app.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SAOTableDirective,
    SAOControlDirective,
    ReactiveFormsModule,
    DatePipe,
    SAOFormArrayControlDirective,
    NgTemplateOutlet,
    SAOInputDirective,
    SAOTableHeaderComponent,
    SAOButtonDirective,
    SAOInputHandlerDirective,
    CdkContextMenuTrigger,
    CdkMenuItem,
    CdkMenu,
    SAOIconDirective,
    NgxMaskDirective,
    SAOAvatarDirective,
    SAOCategoryTotalPipe,
    DecimalPipe,
    SAOPartTotalPipe,
    SAOProfitAndLossPipe,
    SAOBalancesPipe,
    SAOFormErrorDirective,
  ],
  providers: [provideNgxMask()],
})
export class AppComponent implements OnInit {
  //#region Injectors
  public readonly destroyRef = inject(DestroyRef);
  public readonly changeDetectorRef = inject(ChangeDetectorRef);
  //#endregion
  //#region Form
  public readonly controlFormGroup: BuilderControlFormGroup = new FormGroup<
    BuilderControlFormGroup['controls']
  >({
    label: new FormControl<string>('Budget Builder', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    start: new FormControl<string>('2024-01', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    end: new FormControl<string>('2024-12', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  public readonly incomeFormArray: BuilderPartFormArray =
    new FormArray<BuilderGroupFormGroup>([]);
  public readonly expenseFormArray: BuilderPartFormArray =
    new FormArray<BuilderGroupFormGroup>([]);
  //#endregion

  //#region Signals
  public readonly months = toSignal(
    combineLatest([
      this.controlFormGroup.controls.start.valueChanges.pipe(
        startWith(this.controlFormGroup.controls.start.value)
      ),
      this.controlFormGroup.controls.end.valueChanges.pipe(
        startWith(this.controlFormGroup.controls.end.value)
      ),
    ]).pipe(
      map(([start, end]) => calculateMonths(new Date(start), new Date(end)))
    ),
    { initialValue: [] }
  );
  public readonly validRange = toSignal(
    combineLatest([
      this.controlFormGroup.controls.start.valueChanges.pipe(
        startWith(this.controlFormGroup.controls.start.value)
      ),
      this.controlFormGroup.controls.end.valueChanges.pipe(
        startWith(this.controlFormGroup.controls.end.value)
      ),
    ]).pipe(
      map(
        ([start, end]) =>
          !!(
            start &&
            end &&
            new Date(start).getTime() < new Date(end).getTime()
          )
      )
    ),
    { initialValue: false }
  );
  public readonly outOfRange = toSignal(
    this.controlFormGroup.controls.end.valueChanges
      .pipe(startWith(this.controlFormGroup.controls.end.value))
      .pipe(map(end => new Date(end).getTime() > new Date().getTime())),
    { initialValue: false }
  );
  public readonly saveMessage = signal('');
  //#endregion

  //#region Variables
  public readonly Parts = Parts;
  public readonly at = localStorage.getItem('at');
  //#endregion

  //#region Lifecycle
  public async ngOnInit(): Promise<void> {
    /* 1. Check if there is no at in local storage, if not, mock data */
    if (!this.at) {
      await mockAsync();
      localStorage.setItem('at', JSON.stringify(new Date()));
    }

    /* 2. Binding data to controls from database */
    await Promise.all([
      createOrUpdateBuilderControlAsync(this.controlFormGroup),
      createOrUpdateBuilderPartAsync(Parts.Income, this.incomeFormArray),
      createOrUpdateBuilderPartAsync(Parts.Expenses, this.expenseFormArray),
    ]);

    /* 3. Detect changes */
    this.changeDetectorRef.detectChanges();

    /* 4. Listen to range change */
    this.__listenToRangeChange();

    /* 5. Auto save */
    this.__autoSave();
  }

  //#endregion

  //#region Public Methods
  public addCategory(
    formArray: FormArray<BuilderCategoryFormGroup>,
    index?: number
  ): void {
    const group = new FormGroup<BuilderCategoryFormGroup['controls']>({
      label: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      months: new FormArray<FormControl<number>>(
        this.months().map(
          () =>
            new FormControl<number>(0, {
              nonNullable: true,
              validators: [Validators.required, Validators.min(0)],
            })
        )
      ),
    });
    if (index != null) {
      formArray.insert(index + 1, group);
      return;
    }
    formArray.push(group);
  }

  public addGroup(formArray: BuilderPartFormArray, part: Parts): void {
    formArray.push(
      new FormGroup<BuilderGroupFormGroup['controls']>({
        main: new FormGroup<BuilderGroupFormGroupMain['controls']>({
          label: new FormControl<string>('Group', {
            nonNullable: true,
            validators: [Validators.required],
          }),
          months: new FormArray<FormControl<number>>(
            this.months().map(
              () =>
                new FormControl<number>(0, {
                  nonNullable: true,
                  validators: [Validators.required, Validators.min(0)],
                })
            )
          ),
        }),
        categories: new FormArray<BuilderCategoryFormGroup>([]),
        part: new FormControl<Parts>(part, { nonNullable: true }),
      })
    );
  }

  public applyToAll(
    months: FormArray<FormControl<number>>,
    index: number
  ): void {
    months.patchValue(
      Array.from({ length: months.length }).map(() => months.at(index).value)
    );
  }

  public deleteCategory(
    categories: FormArray<BuilderCategoryFormGroup>,
    index: number
  ): void {
    return categories.removeAt(index);
  }

  public deleteGroup(groups: BuilderPartFormArray, index: number): void {
    return groups.removeAt(index);
  }

  //#endregion

  //#region Private Methods
  private __listenToRangeChange(): void {
    race(
      this.controlFormGroup.controls.start.valueChanges,
      this.controlFormGroup.controls.end.valueChanges
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.__resolveRange())
      )
      .subscribe();
  }

  private __autoSave(): void {
    combineLatest([
      this.controlFormGroup.valueChanges.pipe(
        startWith(this.controlFormGroup.value),
        distinctUntilChanged(),
        debounceTime(1000)
      ),
      this.incomeFormArray.valueChanges.pipe(
        startWith(this.incomeFormArray.value),
        distinctUntilChanged(),
        debounceTime(1000)
      ),
      this.expenseFormArray.valueChanges.pipe(
        startWith(this.expenseFormArray.value),
        distinctUntilChanged(),
        debounceTime(1000)
      ),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(async ([control, income, expense]) => {
          await refreshAsync();

          await Promise.all([
            saveControlAsync(control),
            savePartAsync(
              income as BuilderPartFormArray['value'],
              Parts.Income
            ),
            savePartAsync(
              expense as BuilderPartFormArray['value'],
              Parts.Expenses
            ),
          ]);
          this.saveMessage.set(`Auto saved at ${new Date().toLocaleString()}`);
        }),
        debounceTime(3000),
        tap(() => this.saveMessage.set(''))
      )
      .subscribe();
  }

  private __resolveRange(): void {
    if (!this.validRange()) {
      return;
    }

    [
      ...this.incomeFormArray.controls,
      ...this.expenseFormArray.controls,
    ].forEach(control => {
      this.__resolveMonths(control.controls.main.controls.months);

      control.controls.categories.controls.forEach(category => {
        this.__resolveMonths(category.controls.months);
      });
    });
  }

  private __resolveMonths(controls: FormArray<FormControl<number>>): void {
    controls.clear();
    this.months().forEach(() => {
      controls.push(
        new FormControl<number>(0, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0)],
        })
      );
    });
  }

  //#endregion
}
