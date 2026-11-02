import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerBusinessSchema } from "./business.validator.js";

const validInput = () => ({
  owner: {
    fullName: "Ana Perez",
    email: "ana@example.com",
    password: "a-long-password",
    takesAppointments: true,
  },
  business: { name: "El Rey", slug: "el-rey" },
  location: {
    name: "Centro",
    timezone: "America/Argentina/Buenos_Aires",
    currencyCode: "ARS",
  },
});

type Input = ReturnType<typeof validInput>;

const parseWith = (change: (input: Input) => void) => {
  const input = validInput();
  change(input);
  return registerBusinessSchema.safeParse(input);
};

describe("registerBusinessSchema", () => {
  it("accepts a valid signup", () => {
    assert.equal(registerBusinessSchema.safeParse(validInput()).success, true);
  });

  describe("email", () => {
    it("trims and lowercases before validating", () => {
      const result = parseWith((input) => {
        input.owner.email = "  Ana@Example.COM ";
      });
      assert.equal(result.success, true);
      assert.equal(result.data?.owner.email, "ana@example.com");
    });

    it("rejects an invalid address", () => {
      const result = parseWith((input) => {
        input.owner.email = "not-an-email";
      });
      assert.equal(result.success, false);
    });
  });

  describe("timezone", () => {
    for (const timezone of ["+01:00", "-03:00", "Mars/Olympus"]) {
      it(`rejects ${timezone}`, () => {
        const result = parseWith((input) => {
          input.location.timezone = timezone;
        });
        assert.equal(result.success, false);
      });
    }

    for (const timezone of ["UTC", "America/New_York", "America/Argentina/Buenos_Aires"]) {
      it(`accepts ${timezone}`, () => {
        const result = parseWith((input) => {
          input.location.timezone = timezone;
        });
        assert.equal(result.success, true);
      });
    }
  });

  describe("slug", () => {
    for (const slug of ["login", "register", "signup", "dashboard", "assets", "admin", "www"]) {
      it(`rejects reserved slug ${slug}`, () => {
        const result = parseWith((input) => {
          input.business.slug = slug;
        });
        assert.equal(result.success, false);
      });
    }

    for (const slug of ["MyShop", "my--shop", "-shop", "ab"]) {
      it(`rejects malformed slug ${slug}`, () => {
        const result = parseWith((input) => {
          input.business.slug = slug;
        });
        assert.equal(result.success, false);
      });
    }
  });

  describe("countryCode", () => {
    const parseCountry = (countryCode: string) =>
      registerBusinessSchema.safeParse({
        ...validInput(),
        location: { ...validInput().location, countryCode },
      });

    it("uppercases a valid code", () => {
      const result = parseCountry("ar");
      assert.equal(result.success, true);
      assert.equal(result.data?.location.countryCode, "AR");
    });

    for (const countryCode of ["A1", "ARG", "A"]) {
      it(`rejects ${countryCode}`, () => {
        assert.equal(parseCountry(countryCode).success, false);
      });
    }
  });
});
