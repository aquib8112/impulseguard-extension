import { jest } from '@jest/globals';
import { 
  handleStop,
  getTimeLeft, 
  saveSession,
  checkSession,
  pauseSession,
  startCountdown,
  createNewSession,
  togglePauseResume, 
} from "../src/popup/session.js";

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

describe('startCountdown', () => {
  let onEndMock, updateMock, controllerMock, timerMock;

  beforeEach(() => {
    jest.useFakeTimers(); // Freeze time
    global.chrome = {
      storage: {
        local: {
          clear: jest.fn()
        }
      }
    };

    onEndMock = jest.fn();
    updateMock = jest.fn();
    controllerMock = {}; // doesn't need specific shape here
    timerMock = {
      hrInput: {},
      minInput: {},
      secInput: {}
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('calls updateInputsFromSeconds every second and onEnd after time elapses', () => {
    startCountdown(3, onEndMock, updateMock, controllerMock, timerMock);

    expect(updateMock).not.toHaveBeenCalled();
    expect(onEndMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(updateMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000); // Total 3 seconds
    jest.runOnlyPendingTimers();
    expect(updateMock).toHaveBeenCalledTimes(4);
    expect(onEndMock).toHaveBeenCalledWith(controllerMock, timerMock);
    expect(chrome.storage.local.clear).toHaveBeenCalled();
  });
});

describe("pauseSession", () => {
  let session;
  let controller;
  let timer;
  let saveSessionMock, updateUIStateMock, updatePauseButtonToResumeMock, clearFocusSessionAlarmAndBadgeMock;

  beforeEach(() => {
    jest.useFakeTimers();
    global.interval = setInterval(() => {}, 1000);

    jest.spyOn(global, 'clearInterval');

    session = {
      status: "running",
      endTime: Date.now() + 5000
    };

    controller = { pauseBtn: {} };
    timer = { hrInput: {}, minInput: {}, secInput: {} };

    saveSessionMock = jest.fn();
    updateUIStateMock = jest.fn();
    updatePauseButtonToResumeMock = jest.fn();
    clearFocusSessionAlarmAndBadgeMock = jest.fn(); // ← Added mock
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it("pauses the session and updates state/UI/storage", () => {
    pauseSession(
      session,
      300,
      saveSessionMock,
      updateUIStateMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ← Passed here
      controller,
      timer
    );

    // Check internal state
    expect(session.status).toBe("paused");
    expect(session.remainingTime).toBe(300);
    expect(session.endTime).toBeUndefined();

    // Check external calls
    expect(updatePauseButtonToResumeMock).toHaveBeenCalledWith(controller.pauseBtn);
    expect(updateUIStateMock).toHaveBeenCalledWith("paused", controller, timer);
    expect(saveSessionMock).toHaveBeenCalledWith(session);
    expect(clearFocusSessionAlarmAndBadgeMock).toHaveBeenCalled(); // ← New assertion

    // Check timer cleared
    expect(clearInterval).toHaveBeenCalled();
  });
});

describe("checkSession", () => {
  let onEndMock,
  getTimeLeftMock,
  updateUIStateMock,
  startCountdownMock,
  updateInputsFromSecondsMock,
  updatePauseButtonToResumeMock,
  clearFocusSessionAlarmAndBadgeMock;

  let controller, timer;

  beforeEach(() => {
    onEndMock = jest.fn();
    getTimeLeftMock = jest.fn();
    updateUIStateMock = jest.fn();
    startCountdownMock = jest.fn();
    updateInputsFromSecondsMock = jest.fn();
    updatePauseButtonToResumeMock = jest.fn();
    clearFocusSessionAlarmAndBadgeMock = jest.fn(); // ✅

    controller = { pauseBtn: {} };
    timer = { hrInput: {}, minInput: {}, secInput: {} }; // ✅ Ensure defined in all tests

    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          clear: jest.fn()
        }
      }
    };
  });

  it("handles paused session", () => {
    const session = {
      status: "paused",
      remainingTime: 300
    };

    chrome.storage.local.get.mockImplementation((key, cb) => {
      cb({ focusSession: session });
    });

    checkSession(
      onEndMock,
      getTimeLeftMock,
      updateUIStateMock,
      startCountdownMock,
      updateInputsFromSecondsMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅
      controller,
      timer
    );

    expect(updateInputsFromSecondsMock).toHaveBeenCalledWith(300, timer.hrInput, timer.minInput, timer.secInput);
    expect(updateUIStateMock).toHaveBeenCalledWith("paused", controller, timer);
    expect(updatePauseButtonToResumeMock).toHaveBeenCalledWith(controller.pauseBtn);
  });

  it("handles running session with time left", () => {
    const session = {
      status: "running",
      endTime: Date.now() + 5000
    };

    chrome.storage.local.get.mockImplementation((key, cb) => {
      cb({ focusSession: session });
    });

    getTimeLeftMock.mockReturnValue(120);

    checkSession(
      onEndMock,
      getTimeLeftMock,
      updateUIStateMock,
      startCountdownMock,
      updateInputsFromSecondsMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅
      controller,
      timer
    );

    expect(getTimeLeftMock).toHaveBeenCalledWith(session);
    expect(updateInputsFromSecondsMock).toHaveBeenCalledWith(120, timer.hrInput, timer.minInput, timer.secInput);
    expect(startCountdownMock).toHaveBeenCalledWith(120, onEndMock, updateInputsFromSecondsMock, controller, timer);
    expect(updateUIStateMock).toHaveBeenCalledWith("running", controller, timer);
  });

  it("clears expired session", () => {
    const session = {
      status: "running",
      endTime: Date.now() - 1000
    };

    chrome.storage.local.get.mockImplementation((key, cb) => {
      cb({ focusSession: session });
    });

    getTimeLeftMock.mockReturnValue(0);

    checkSession(
      onEndMock,
      getTimeLeftMock,
      updateUIStateMock,
      startCountdownMock,
      updateInputsFromSecondsMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅
      controller,
      timer
    );

    expect(chrome.storage.local.clear).toHaveBeenCalled();
    expect(updateUIStateMock).toHaveBeenCalledWith("idle", controller, timer);
  });
});

describe("togglePauseResume", () => {
  let onEndMock, saveSessionMock, pauseSessionMock, updateUIStateMock;
  let startCountdownMock, updateInputsFromSecondsMock;
  let updatePauseButtonToResumeMock, updateResumeButtonToPauseMock;
  let scheduleFocusSessionAlarmMock, clearFocusSessionAlarmAndBadgeMock;
  let controller, timer;

  beforeEach(() => {
    onEndMock = jest.fn();
    saveSessionMock = jest.fn();
    pauseSessionMock = jest.fn();
    updateUIStateMock = jest.fn();
    startCountdownMock = jest.fn();
    updateInputsFromSecondsMock = jest.fn();
    updatePauseButtonToResumeMock = jest.fn();
    updateResumeButtonToPauseMock = jest.fn();
    scheduleFocusSessionAlarmMock = jest.fn();
    clearFocusSessionAlarmAndBadgeMock = jest.fn();

    controller = { pauseBtn: {} };
    timer = { hrInput: {}, minInput: {}, secInput: {} };

    global.chrome = {
      storage: {
        local: {
          get: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        remove: jest.fn()
      },
      runtime: {
        getURL: jest.fn().mockReturnValue("chrome-extension://abc123/visionboard/visionboard.html")
      }
    };
  });

  it("pauses running session", () => {
    const session = { status: "running" };

    chrome.storage.local.get.mockImplementation((key, cb) => {
      cb({ focusSession: session });
    });

    togglePauseResume(
      120,
      onEndMock,
      saveSessionMock,
      pauseSessionMock,
      updateUIStateMock,
      startCountdownMock,
      updateInputsFromSecondsMock,
      updatePauseButtonToResumeMock,
      updateResumeButtonToPauseMock,
      scheduleFocusSessionAlarmMock,
      clearFocusSessionAlarmAndBadgeMock,
      controller,
      timer
    );

    expect(pauseSessionMock).toHaveBeenCalledWith(
      session,
      120,
      saveSessionMock,
      updateUIStateMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock,
      controller,
      timer
    );
  });

  it("resumes paused session", () => {
    const session = { status: "paused", remainingTime: 90 };

    chrome.storage.local.get.mockImplementation((key, cb) => {
      cb({ focusSession: session });
    });

    chrome.tabs.query.mockImplementation((_, cb) => cb([]));

    togglePauseResume(
      120,
      onEndMock,
      saveSessionMock,
      pauseSessionMock,
      updateUIStateMock,
      startCountdownMock,
      updateInputsFromSecondsMock,
      updatePauseButtonToResumeMock,
      updateResumeButtonToPauseMock,
      scheduleFocusSessionAlarmMock,
      clearFocusSessionAlarmAndBadgeMock,
      controller,
      timer
    );

    expect(session.status).toBe("running");
    expect(session.endTime).toBeGreaterThan(Date.now());
    expect(session.remainingTime).toBeUndefined();

    expect(updateResumeButtonToPauseMock).toHaveBeenCalledWith(controller.pauseBtn);
    expect(startCountdownMock).toHaveBeenCalledWith(90, onEndMock, updateInputsFromSecondsMock, controller, timer);
    expect(updateUIStateMock).toHaveBeenCalledWith("running", controller, timer);
    expect(saveSessionMock).toHaveBeenCalledWith(session);
    expect(scheduleFocusSessionAlarmMock).toHaveBeenCalledWith(90);
  });

  it("removes visionboard tab if open", () => {
    const session = { status: "paused", remainingTime: 30 };
    const vbTab = { id: 99, url: "chrome-extension://abc123/visionboard/visionboard.html" };

    chrome.storage.local.get.mockImplementation((key, cb) => {
      cb({ focusSession: session });
    });

    chrome.tabs.query.mockImplementation((_, cb) => cb([vbTab]));

    togglePauseResume(
      60,
      onEndMock,
      saveSessionMock,
      pauseSessionMock,
      updateUIStateMock,
      startCountdownMock,
      updateInputsFromSecondsMock,
      updatePauseButtonToResumeMock,
      updateResumeButtonToPauseMock,
      scheduleFocusSessionAlarmMock,
      clearFocusSessionAlarmAndBadgeMock,
      controller,
      timer
    );

    expect(chrome.tabs.remove).toHaveBeenCalledWith(99);
  });
});

describe("handleStop", () => {
  let pauseSessionMock, updateUIStateMock, updatePauseButtonToResumeMock, clearFocusSessionAlarmAndBadgeMock;
  let session, controller, timer;
  let chromeTabsQueryMock, chromeTabsUpdateMock, chromeTabsCreateMock;

  beforeEach(() => {
    pauseSessionMock = jest.fn();
    updateUIStateMock = jest.fn();
    updatePauseButtonToResumeMock = jest.fn();
    clearFocusSessionAlarmAndBadgeMock = jest.fn(); // ✅ Added

    session = { status: "running" };
    controller = { stopBtn: { disabled: false }, pauseBtn: {} };
    timer = { hrInput: {}, minInput: {}, secInput: {} };

    chromeTabsQueryMock = jest.fn();
    chromeTabsUpdateMock = jest.fn();
    chromeTabsCreateMock = jest.fn();

    global.chrome = {
      runtime: {
        getURL: jest.fn(() => "chrome-extension://xyz/src/visionboard/visionboard.html")
      },
      tabs: {
        query: chromeTabsQueryMock,
        update: chromeTabsUpdateMock,
        create: chromeTabsCreateMock
      }
    };
  });

  it("pauses session and disables stop button if session is running", () => {
    chromeTabsQueryMock.mockImplementation((_, cb) => cb([]));

    handleStop(
      session,
      120,
      jest.fn(), // saveSession (not used here)
      pauseSessionMock,
      updateUIStateMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅ Added
      controller,
      timer
    );

    expect(pauseSessionMock).toHaveBeenCalledWith(
      session,
      120,
      expect.any(Function),
      updateUIStateMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅ Added
      controller,
      timer
    );

    expect(controller.stopBtn.disabled).toBe(true);
    expect(updateUIStateMock).toHaveBeenCalledWith("paused", controller, timer);
  });

  it("opens a new visionboard tab if none exists", () => {
    chromeTabsQueryMock.mockImplementation((_, cb) => cb([]));

    handleStop(
      session,
      60,
      jest.fn(),
      pauseSessionMock,
      updateUIStateMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅ Added
      controller,
      timer
    );

    expect(chrome.runtime.getURL).toHaveBeenCalledWith("src/visionboard/visionboard.html");
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "chrome-extension://xyz/src/visionboard/visionboard.html"
    });
  });

  it("activates visionboard tab if it exists", () => {
    const vbTab = { id: 42, url: "chrome-extension://xyz/src/visionboard/visionboard.html" };
    chromeTabsQueryMock.mockImplementation((_, cb) => cb([vbTab]));

    handleStop(
      session,
      90,
      jest.fn(),
      pauseSessionMock,
      updateUIStateMock,
      updatePauseButtonToResumeMock,
      clearFocusSessionAlarmAndBadgeMock, // ✅ Added
      controller,
      timer
    );

    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true });
  });
});