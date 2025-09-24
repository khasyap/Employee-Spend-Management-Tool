import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadBill } from './upload-bill';

describe('UploadBill', () => {
  let component: UploadBill;
  let fixture: ComponentFixture<UploadBill>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UploadBill]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadBill);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
