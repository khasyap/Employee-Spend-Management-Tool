import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCabRequests } from './admin-cab-requests';

describe('AdminCabRequests', () => {
  let component: AdminCabRequests;
  let fixture: ComponentFixture<AdminCabRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminCabRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCabRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
