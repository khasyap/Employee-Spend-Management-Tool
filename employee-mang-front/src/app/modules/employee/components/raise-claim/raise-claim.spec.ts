import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaiseClaim } from './raise-claim';

describe('RaiseClaim', () => {
  let component: RaiseClaim;
  let fixture: ComponentFixture<RaiseClaim>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RaiseClaim]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RaiseClaim);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
