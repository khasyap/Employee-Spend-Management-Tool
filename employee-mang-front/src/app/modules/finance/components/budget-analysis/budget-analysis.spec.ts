import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetAnalysis } from './budget-analysis';

describe('BudgetAnalysis', () => {
  let component: BudgetAnalysis;
  let fixture: ComponentFixture<BudgetAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BudgetAnalysis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetAnalysis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
