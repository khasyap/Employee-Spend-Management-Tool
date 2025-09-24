import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewClaims } from './review-claims';

describe('ReviewClaims', () => {
  let component: ReviewClaims;
  let fixture: ComponentFixture<ReviewClaims>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReviewClaims]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewClaims);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
