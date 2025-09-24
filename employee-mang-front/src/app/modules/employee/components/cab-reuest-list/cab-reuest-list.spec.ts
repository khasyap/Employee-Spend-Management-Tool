import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabReuestList } from './cab-reuest-list';

describe('CabReuestList', () => {
  let component: CabReuestList;
  let fixture: ComponentFixture<CabReuestList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabReuestList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabReuestList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
