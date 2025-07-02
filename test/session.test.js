import { jest } from '@jest/globals';
import { getTimeLeft, createNewSession } from "../src/popup/session.js";

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

describe("createNewSession", () => {
  it("should return a valid session object", () => {
    // Arrange
    const totalSeconds = 120;
    const whitelist = ["https://example.com", "https://another.com"];
    const before = Date.now();

    // Act
    const session = createNewSession(totalSeconds, whitelist);
    const after = Date.now();

    // Assert
    expect(session.status).toBe("running");
    expect(session.originalTime).toBe(totalSeconds);
    expect(session.whitelist).toEqual(whitelist);

    // Check that endTime is within a reasonable window (±50ms)
    const expectedEndTimeMin = before + totalSeconds * 1000;
    const expectedEndTimeMax = after + totalSeconds * 1000;
    expect(session.endTime).toBeGreaterThanOrEqual(expectedEndTimeMin);
    expect(session.endTime).toBeLessThanOrEqual(expectedEndTimeMax);
  });
});

import { saveSession } from '../src/popup/session.js';

describe('saveSession', () => {
  beforeEach(() => {
    global.chrome = {storage: { local: { set: jest.fn() }}};});

  it('calls chrome.storage.local.set with correct session object', () => {
    const session = {
      status: "running",
      endTime: 1234567890,
      originalTime: 300,
      whitelist: ["https://example.com"]
    };

    saveSession(session);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ focusSession: session });
  });
});
