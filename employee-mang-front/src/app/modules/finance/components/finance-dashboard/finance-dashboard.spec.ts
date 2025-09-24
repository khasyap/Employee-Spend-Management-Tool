import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceDashboard } from './finance-dashboard';

describe('FinanceDashboard', () => {
  let component: FinanceDashboard;
  let fixture: ComponentFixture<FinanceDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FinanceDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
