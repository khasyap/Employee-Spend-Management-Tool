import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingBills } from './pending-bills';

describe('PendingBills', () => {
  let component: PendingBills;
  let fixture: ComponentFixture<PendingBills>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PendingBills]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingBills);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
