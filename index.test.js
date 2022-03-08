const fs = require("fs");
const chai = require("chai");
const expect = chai.expect;
const mock = require("mock-fs");
const formatter = require("./index");

let messages = [];
const logger = {
  log: (m) => messages.push(m),
  group: (m) => messages.push(m),
  groupEnd: () => {},
};

describe("eslint-ratchet", () => {
  it("doesn't throw errors or log messages when there are no changes", () => {
    setupMocks();
    formatter(getMockResults(), null, logger);
    expect(messages == []);
    restoreMocks();
  });

  it("throws errors and messages when violations increase", () => {
    const newResults = getMockResults();
    newResults[1].errorCount = 3;
    newResults[1].messages.push({
      ruleId: "react/jsx-no-target-blank",
      severity: 2,
      message:
        'Using target="_blank" without rel="noreferrer" (which implies rel="noopener") is a security risk in older browsers: see https://mathiasbynens.github.io/rel-noopener/#recommendations',
      messageId: "noTargetBlankWithoutNoreferrer",
    });
    const expectedLatest = {
      "some/path/file-ajsx": {
        "react/jsx-no-target-blank": {
          warning: 0,
          error: 3,
        },
      },
      "another/path/file-b.js": {
        "@productplan/custom-rules/throw-or-log": {
          warning: 2,
          error: 0,
        },
      },
    };
    const expectedMessages = [
      "⚠️  eslint-ratchet: Changes to eslint results detected!!!",
      "some/path/file-ajsx",
      "react/jsx-no-target-blank",
      "--> error: 3 (previously: 2)",
      "🔥",
      "These latest eslint results have been saved to eslint-ratchet-temp.json. \nIf these results were expected then use them to replace the content of eslint-ratchet.json and check it in.",
    ];

    setupMocks();
    expect(() => formatter(newResults, null, logger)).to.throw();
    expect(JSON.stringify(messages)).to.equal(JSON.stringify(expectedMessages));

    const newValues = JSON.parse(fs.readFileSync("./eslint-ratchet-temp.json"));
    expect(JSON.stringify(newValues)).to.equal(JSON.stringify(expectedLatest));
    restoreMocks();
  });

  it("updates thresholds and messages when violations decrease", () => {
    const newResults = getMockResults();
    newResults[1].errorCount = 0;
    newResults[1].messages = [];
    const expectedLatest = {
      "another/path/file-b.js": {
        "@productplan/custom-rules/throw-or-log": { warning: 2, error: 0 },
      },
    };
    const expectedMessages = [
      "⚠️  eslint-ratchet: Changes to eslint results detected!!!",
      "some/path/file-ajsx",
      "react/jsx-no-target-blank",
      "--> error: 0 (previously: 2)",
    ];

    setupMocks();
    formatter(newResults, null, logger);
    expect(JSON.stringify(messages)).to.equal(JSON.stringify(expectedMessages));

    const newValues = JSON.parse(fs.readFileSync("./eslint-ratchet.json"));
    expect(JSON.stringify(newValues)).to.equal(JSON.stringify(expectedLatest));
    restoreMocks();
  });
});

const setupMocks = () => {
  mock({
    "eslint-ratchet.json": mock.file({
      content: JSON.stringify(getMockThresholds()),
    }),
    "eslint-ratchet-temp.json": JSON.stringify({}),
  });
};

const restoreMocks = () => {
  messages = [];
  mock.restore();
};

const getMockResults = () => [
  {
    filePath: "app/assets/javascripts/actions/notification-actions.js",
    messages: [],
    errorCount: 0,
    warningCount: 0,
  },
  {
    filePath: "some/path/file-ajsx",
    messages: [
      {
        ruleId: "react/jsx-no-target-blank",
        severity: 2,
      },
      {
        ruleId: "react/jsx-no-target-blank",
        severity: 2,
      },
    ],
    errorCount: 2,
    warningCount: 0,
  },
  {
    filePath: "another/path/file-b.js",
    messages: [
      {
        ruleId: "@productplan/custom-rules/throw-or-log",
        severity: 1,
      },
      {
        ruleId: "@productplan/custom-rules/throw-or-log",
        severity: 1,
      },
    ],
    errorCount: 0,
    warningCount: 2,
  },
];

const getMockThresholds = () => ({
  "some/path/file-ajsx": {
    "react/jsx-no-target-blank": {
      warning: 0,
      error: 2,
    },
  },
  "another/path/file-b.js": {
    "@productplan/custom-rules/throw-or-log": {
      warning: 2,
      error: 0,
    },
  },
});
