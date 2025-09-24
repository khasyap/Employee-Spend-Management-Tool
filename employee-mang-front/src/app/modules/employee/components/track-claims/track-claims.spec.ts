import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackClaims } from './track-claims';

describe('TrackClaims', () => {
  let component: TrackClaims;
  let fixture: ComponentFixture<TrackClaims>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TrackClaims]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackClaims);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
