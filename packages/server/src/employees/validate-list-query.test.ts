import { describe, expect, it } from "bun:test";
import { validateListQuery } from "./validate-list-query";

const validate = (query: string) => validateListQuery(new URLSearchParams(query));

describe("validateListQuery", () => {
  it("defaults to the first page of 50", () => {
    expect(validate("")).toEqual({ ok: true, value: { page: 1, pageSize: 50 } });
  });

  it("reads the country, department, and job title filters, trimmed", () => {
    expect(validate("country=IN&department=%20Engineering%20&jobTitle=Software+Engineer")).toEqual({
      ok: true,
      value: { page: 1, pageSize: 50, country: "IN", department: "Engineering", jobTitle: "Software Engineer" },
    });
  });

  it("treats a blank filter as no filter", () => {
    expect(validate("country=&department=%20%20")).toEqual({ ok: true, value: { page: 1, pageSize: 50 } });
  });

  it("reads page and pageSize", () => {
    expect(validate("page=3&pageSize=100")).toEqual({ ok: true, value: { page: 3, pageSize: 100 } });
  });

  it.each(["0", "101", "abc", "1.5", "", "-5"])("rejects pageSize=%p", (pageSize) => {
    expect(validate(`pageSize=${pageSize}`)).toEqual({
      ok: false,
      errors: { pageSize: "must be a whole number from 1 to 100" },
    });
  });

  it.each(["0", "1.5", "abc", "", "-1", "1e3"])("rejects page=%p", (page) => {
    expect(validate(`page=${page}`)).toEqual({ ok: false, errors: { page: "must be a whole number of 1 or more" } });
  });
});
