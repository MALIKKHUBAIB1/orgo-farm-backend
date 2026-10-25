import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCouponDiscount,
  couponFields,
  couponIsAvailable,
} from "../src/controllers/couponController.js";

test("percentage coupons honor their maximum discount", () => {
  assert.equal(
    calculateCouponDiscount(
      { type: "percent", value: 20, maxDiscount: 150, minOrder: 0 },
      1000,
      100,
    ),
    150,
  );
});

test("fixed coupons cannot discount more than the subtotal", () => {
  assert.equal(
    calculateCouponDiscount({ type: "fixed", value: 500, minOrder: 0 }, 300, 100),
    300,
  );
});

test("free-shipping coupons waive the selected shipping fee", () => {
  assert.equal(
    calculateCouponDiscount({ type: "shipping", minOrder: 0 }, 300, 100),
    100,
  );
});

test("coupon minimum order is enforced", () => {
  assert.throws(
    () => calculateCouponDiscount({ type: "fixed", value: 100, minOrder: 500 }, 300, 0),
    /minimum order of ₹500/,
  );
});

test("coupon end dates remain active through the selected day", () => {
  const fields = couponFields({
    code: "DAYEND",
    message: "Last day",
    type: "percent",
    value: 10,
    minOrder: 0,
    maxDiscount: 0,
    endsAt: "2026-10-25",
  });
  assert.equal(fields.endsAt.toISOString(), "2026-10-25T23:59:59.999Z");
});

test("legacy midnight end dates remain active through their calendar day", () => {
  const coupon = { startsAt: null, endsAt: new Date("2026-10-25T00:00:00.000Z") };
  assert.equal(couponIsAvailable(coupon, new Date("2026-10-25T12:00:00.000Z")), true);
  assert.equal(couponIsAvailable(coupon, new Date("2026-10-26T00:00:00.000Z")), false);
});

test("admin cannot create percentage discounts over 100 percent", () => {
  assert.throws(
    () =>
      couponFields({
        code: "TOOMUCH",
        message: "Invalid",
        type: "percent",
        value: 101,
      }),
    /cannot exceed 100/,
  );
});
