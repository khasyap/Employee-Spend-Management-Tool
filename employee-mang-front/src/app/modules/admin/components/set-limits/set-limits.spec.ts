import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetLimits } from './set-limits';

describe('SetLimits', () => {
  let component: SetLimits;
  let fixture: ComponentFixture<SetLimits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SetLimits]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetLimits);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
