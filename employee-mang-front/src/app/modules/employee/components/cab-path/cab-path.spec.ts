import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabPath } from './cab-path';

describe('CabPath', () => {
  let component: CabPath;
  let fixture: ComponentFixture<CabPath>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabPath]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabPath);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
