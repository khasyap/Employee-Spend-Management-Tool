import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovedBills } from './approved-bills';

describe('ApprovedBills', () => {
  let component: ApprovedBills;
  let fixture: ComponentFixture<ApprovedBills>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApprovedBills]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovedBills);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
