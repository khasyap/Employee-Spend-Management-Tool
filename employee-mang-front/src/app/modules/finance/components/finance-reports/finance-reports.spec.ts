import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceReports } from './finance-reports';

describe('FinanceReports', () => {
  let component: FinanceReports;
  let fixture: ComponentFixture<FinanceReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FinanceReports]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceReports);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
