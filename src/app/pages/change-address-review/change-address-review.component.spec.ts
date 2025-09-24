import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeAddressReviewComponent } from '././change-address-review.component';

describe('ChangeAddressReviewComponent', () => {
  let component: ChangeAddressReviewComponent;
  let fixture: ComponentFixture<ChangeAddressReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeAddressReviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeAddressReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
