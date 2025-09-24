import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabCancellation } from './cab-cancellation';

describe('CabCancellation', () => {
  let component: CabCancellation;
  let fixture: ComponentFixture<CabCancellation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabCancellation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabCancellation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
