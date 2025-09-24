import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyClaim } from './verify-claim';

describe('VerifyClaim', () => {
  let component: VerifyClaim;
  let fixture: ComponentFixture<VerifyClaim>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VerifyClaim]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyClaim);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
