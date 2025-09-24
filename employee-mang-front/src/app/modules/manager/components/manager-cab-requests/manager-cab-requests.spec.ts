import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerCabRequests } from './manager-cab-requests';

describe('ManagerCabRequests', () => {
  let component: ManagerCabRequests;
  let fixture: ComponentFixture<ManagerCabRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ManagerCabRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerCabRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
