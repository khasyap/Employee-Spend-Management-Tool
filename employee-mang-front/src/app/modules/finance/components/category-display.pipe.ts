import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'categoryDisplay'
})
export class CategoryDisplayPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    return value.name || value.code || 'N/A';
  }
}