import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabRequestDetail } from './cab-request-detail';

describe('CabRequestDetail', () => {
  let component: CabRequestDetail;
  let fixture: ComponentFixture<CabRequestDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabRequestDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabRequestDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
