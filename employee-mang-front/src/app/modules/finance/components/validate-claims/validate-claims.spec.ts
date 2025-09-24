import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidateClaims } from './validate-claims';

describe('ValidateClaims', () => {
  let component: ValidateClaims;
  let fixture: ComponentFixture<ValidateClaims>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ValidateClaims]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidateClaims);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
