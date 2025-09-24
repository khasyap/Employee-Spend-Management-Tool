import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderServices } from './order-services';

describe('OrderServices', () => {
  let component: OrderServices;
  let fixture: ComponentFixture<OrderServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrderServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderServices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
