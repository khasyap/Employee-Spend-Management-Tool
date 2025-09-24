import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabRequestCreate } from './cab-request-create';

describe('CabRequestCreate', () => {
  let component: CabRequestCreate;
  let fixture: ComponentFixture<CabRequestCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabRequestCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabRequestCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
