import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'userDisplay'
})
export class UserDisplayPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    return value.name || value.email || 'N/A';
  }
}