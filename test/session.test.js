import { getTimeLeft } from "../src/popup/session.js";

describe("getTimeLeft", () => {
  test("returns correct time difference in seconds", () => {
    const now = Date.now();
    const session = {
      endTime: now + 5000, // 5 seconds in the future
    };

    // Stub Date.now() to return `now`
    const originalNow = Date.now;
    Date.now = () => now;

    const result = getTimeLeft(session);
    expect(result).toBe(5);

    // Clean up
    Date.now = originalNow;
  });
});
