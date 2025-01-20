import { Parts } from '../enums';

export type BuilderPart = BuilderGroup[];

export type BuilderGroup = {
  id?: number;
  main: Omit<BuilderCategory, 'group' | 'id'>;
  part: Parts;
};

export type BuilderCategory = {
  id?: number;
  label: string;
  months: number[];
  group: number;
};

export type BuilderControl = {
  id?: number;
  label: string;
  start: string;
  end: string;
};
