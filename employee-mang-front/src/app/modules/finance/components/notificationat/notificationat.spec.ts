import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Notificationat } from './notificationat';

describe('Notificationat', () => {
  let component: Notificationat;
  let fixture: ComponentFixture<Notificationat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Notificationat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Notificationat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
