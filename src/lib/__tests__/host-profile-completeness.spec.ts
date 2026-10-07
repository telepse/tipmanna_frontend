import { describe, expect, it } from "vitest";

import { getProfileCompleteness } from "../host-profile-completeness";

const completeUkIndividual = {
  firstName: "Alex",
  lastName: "Host",
  homeAddress: "1 Example Street",
  city: "London",
  state: "Greater London",
  postalCode: "SW1A 1AA",
  country: "United Kingdom",
  niNumber: "QQ123456C",
  dateOfBirth: "1990-01-01",
  gender: "MALE",
  accountName: "Alex Host",
  accountNumber: "12345678",
  sortCode: "12-34-56",
};

const completeUkOrganisation = {
  registeredCompanyName: "Tipmanna Ltd",
  companyRegistrationNumber: "12345678",
  registeredAddress: "1 Example Street",
  city: "London",
  state: "Greater London",
  postalCode: "SW1A 1AA",
  country: "United Kingdom",
  dateOfBirth: "1980-01-01",
  gender: "FEMALE",
  uniqueTaxpayerReference: "1234567890",
  invoice: "https://cdn.example/invoice.pdf",
  accountName: "Tipmanna Ltd",
  accountNumber: "12345678",
  sortCode: "12-34-56",
};

describe("getProfileCompleteness", () => {
  it("returns 100 for complete individual with gender", () => {
    expect(getProfileCompleteness("INDIVIDUAL", completeUkIndividual)).toBe(
      100
    );
  });

  it("returns below 100 when individual gender is missing", () => {
    const { gender: _gender, ...withoutGender } = completeUkIndividual;
    expect(getProfileCompleteness("INDIVIDUAL", withoutGender)).toBeLessThan(
      100
    );
  });

  it("returns below 100 when individual accountName is missing", () => {
    const { accountName: _accountName, ...rest } = completeUkIndividual;
    expect(getProfileCompleteness("INDIVIDUAL", rest)).toBeLessThan(100);
  });

  it("returns 100 for complete organisation with gender", () => {
    expect(getProfileCompleteness("ORGANIZATION", completeUkOrganisation)).toBe(
      100
    );
  });

  it("returns below 100 when organisation gender is missing", () => {
    const { gender: _gender, ...withoutGender } = completeUkOrganisation;
    expect(getProfileCompleteness("ORGANIZATION", withoutGender)).toBeLessThan(
      100
    );
  });

  it("returns below 100 when organisation invoice is missing", () => {
    const { invoice: _invoice, ...withoutInvoice } = completeUkOrganisation;
    expect(getProfileCompleteness("ORGANIZATION", withoutInvoice)).toBeLessThan(
      100
    );
  });
});
