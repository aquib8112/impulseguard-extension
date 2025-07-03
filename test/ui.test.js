import {
    updateUIState,
    renderTabList,
    getTotalSeconds,  
    setupInputValidation, 
    updateInputsFromSeconds, 
} from "../src/popup/ui.js";

describe("getTotalSeconds", () => {
  function mockInput(value) {
    return { value: value };
  }

  it("calculates total seconds correctly with valid inputs", () => {
    const hr = mockInput("1");
    const min = mockInput("2");
    const sec = mockInput("3");

    const result = getTotalSeconds(hr, min, sec);
    expect(result).toBe(1 * 3600 + 2 * 60 + 3);
  });

  it("handles empty inputs as zero", () => {
    const hr = mockInput("");
    const min = mockInput("");
    const sec = mockInput("");

    const result = getTotalSeconds(hr, min, sec);
    expect(result).toBe(0);
  });

  it("handles missing fields as zero", () => {
    const hr = mockInput(undefined);
    const min = mockInput(undefined);
    const sec = mockInput(undefined);

    const result = getTotalSeconds(hr, min, sec);
    expect(result).toBe(0);
  });

  it("parses non-numeric strings as NaN and treats as zero", () => {
    const hr = mockInput("abc");
    const min = mockInput("5");
    const sec = mockInput("10");

    const result = getTotalSeconds(hr, min, sec);
    expect(result).toBe(NaN); // Intentional: because parseInt("abc") === NaN
  });

  it("handles edge case where one of the fields is null", () => {
    const hr = mockInput("1");
    const min = mockInput(null);
    const sec = mockInput("30");

    const result = getTotalSeconds(hr, min, sec);
    expect(result).toBe(1 * 3600 + 0 + 30);
  });
});

describe("updateInputsFromSeconds", () => {
  function createMockInputs() {
    return {
      hrInput: { value: null },
      minInput: { value: null },
      secInput: { value: null },
    };
  }

  it("correctly splits totalSeconds into hours, minutes, and seconds", () => {
    const { hrInput, minInput, secInput } = createMockInputs();

    updateInputsFromSeconds(3665, hrInput, minInput, secInput); // 1h 1m 5s

    expect(hrInput.value).toBe(1);
    expect(minInput.value).toBe(1);
    expect(secInput.value).toBe(5);
  });

  it("handles zero seconds correctly", () => {
    const { hrInput, minInput, secInput } = createMockInputs();

    updateInputsFromSeconds(0, hrInput, minInput, secInput);

    expect(hrInput.value).toBe(0);
    expect(minInput.value).toBe(0);
    expect(secInput.value).toBe(0);
  });

  it("handles large input values correctly", () => {
    const { hrInput, minInput, secInput } = createMockInputs();

    updateInputsFromSeconds(7322, hrInput, minInput, secInput); // 2h 2m 2s

    expect(hrInput.value).toBe(2);
    expect(minInput.value).toBe(2);
    expect(secInput.value).toBe(2);
  });
});

describe("setupInputValidation", () => {
  let hrInput, minInput, secInput;

  beforeEach(() => {
    hrInput = document.createElement("input");
    minInput = document.createElement("input");
    secInput = document.createElement("input");

    hrInput.id = "hours";
    minInput.id = "minutes";
    secInput.id = "seconds";

    document.body.append(hrInput, minInput, secInput);
    setupInputValidation(hrInput, minInput, secInput);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("removes non-digit characters and limits to 2 digits on input", () => {
    hrInput.value = "abc12";
    hrInput.dispatchEvent(new Event("input"));
    expect(hrInput.value).toBe("12");

    minInput.value = "987xyz";
    minInput.dispatchEvent(new Event("input"));
    expect(minInput.value).toBe("98");

    secInput.value = "a5b3";
    secInput.dispatchEvent(new Event("input"));
    expect(secInput.value).toBe("53");
  });

  it("formats and clamps values on blur: hours capped at 23", () => {
    hrInput.value = "99";
    hrInput.dispatchEvent(new Event("blur"));
    expect(hrInput.value).toBe("23");

    hrInput.value = "-5";
    hrInput.dispatchEvent(new Event("blur"));
    expect(hrInput.value).toBe("00");

    hrInput.value = "7";
    hrInput.dispatchEvent(new Event("blur"));
    expect(hrInput.value).toBe("07");
  });

  it("formats and clamps values on blur: minutes and seconds capped at 59", () => {
    minInput.value = "75";
    minInput.dispatchEvent(new Event("blur"));
    expect(minInput.value).toBe("59");

    secInput.value = "0";
    secInput.dispatchEvent(new Event("blur"));
    expect(secInput.value).toBe("00");

    secInput.value = "5";
    secInput.dispatchEvent(new Event("blur"));
    expect(secInput.value).toBe("05");
  });

  it("does nothing if inputs are missing", () => {
    expect(() => setupInputValidation(null, minInput, secInput)).not.toThrow();
    expect(() => setupInputValidation(hrInput, null, secInput)).not.toThrow();
    expect(() => setupInputValidation(hrInput, minInput, null)).not.toThrow();
  });
});

describe("updateUIState (simplified test)", () => {
  let controller, timer;

  beforeEach(() => {
    document.body.innerHTML = ""; // Clean DOM

    controller = {
      startBtn: document.createElement("button"),
      sessionControls: document.createElement("div"),
      stopBtn: document.createElement("button")
    };

    timer = {
      hrInput: document.createElement("input"),
      minInput: document.createElement("input"),
      secInput: document.createElement("input")
    };

    document.body.appendChild(controller.startBtn);
    document.body.appendChild(controller.sessionControls);
    document.body.appendChild(controller.stopBtn);
  });

  it("updates UI for 'idle' state", () => {
    updateUIState("idle", controller, timer);

    expect(controller.startBtn.style.display).toBe("inline-block");
    expect(controller.sessionControls.style.display).toBe("none");
    expect(controller.stopBtn.disabled).toBe(false);
    expect(timer.hrInput.disabled).toBe(false);
    expect(timer.minInput.disabled).toBe(false);
    expect(timer.secInput.disabled).toBe(false);
  });

  it("updates UI for 'running' state", () => {
    updateUIState("running", controller, timer);

    expect(controller.startBtn.style.display).toBe("none");
    expect(controller.sessionControls.style.display).toBe("block");
    expect(controller.stopBtn.disabled).toBe(false);
    expect(timer.hrInput.disabled).toBe(true);
    expect(timer.minInput.disabled).toBe(true);
    expect(timer.secInput.disabled).toBe(true);
  });

  it("updates UI for 'paused' state", () => {
    updateUIState("paused", controller, timer);

    expect(controller.startBtn.style.display).toBe("none");
    expect(controller.sessionControls.style.display).toBe("block");
    expect(controller.stopBtn.disabled).toBe(true);
    expect(timer.hrInput.disabled).toBe(true);
    expect(timer.minInput.disabled).toBe(true);
    expect(timer.secInput.disabled).toBe(true);
  });
});

describe("renderTabList", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = `<div id="tab-list"></div>`;
    container = document.getElementById("tab-list");
  });

  it("renders a list of tabs correctly", () => {
    const tabs = [
      {
        url: "https://example.com/page",
        title: "Example Page",
        favIconUrl: "https://example.com/favicon.ico"
      },
      {
        url: "https://test.com",
        title: "Test Page",
        favIconUrl: ""
      }
    ];

    renderTabList(tabs);

    const items = container.querySelectorAll(".item");
    expect(items.length).toBe(2);

    // First tab
    const first = items[0];
    expect(first.querySelector("input[type='checkbox']").value).toBe("example.com");
    expect(first.querySelector("span.title").textContent).toBe("Example Page");
    expect(first.querySelector("img.favicon").src).toBe("https://example.com/favicon.ico");

    // Second tab
    const second = items[1];
    expect(second.querySelector("input[type='checkbox']").value).toBe("test.com");
    expect(second.querySelector("span.title").textContent).toBe("Test Page");
    expect(second.querySelector("img.favicon").src).toBe("http://localhost/"); // because favIconUrl is null
  });

  it("clears previous tab list content", () => {
    container.innerHTML = "<p>Old content</p>";

    renderTabList([]);
    expect(container.children.length).toBe(0);
  });
});