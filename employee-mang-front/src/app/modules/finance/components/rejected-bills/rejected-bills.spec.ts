import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectedBills } from './rejected-bills';

describe('RejectedBills', () => {
  let component: RejectedBills;
  let fixture: ComponentFixture<RejectedBills>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RejectedBills]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RejectedBills);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
