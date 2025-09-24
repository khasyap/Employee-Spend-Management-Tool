import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceCabRequests } from './finance-cab-requests';

describe('FinanceCabRequests', () => {
  let component: FinanceCabRequests;
  let fixture: ComponentFixture<FinanceCabRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FinanceCabRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceCabRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
