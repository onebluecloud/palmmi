module.exports = ({ test, assert, loadFixture, root }) => {
  const path = require("node:path");
  const {
    ADJACENT_THRESHOLD,
    ADJACENT_RULES,
    resolveAdjacentPersona,
  } = require(path.join(root, "lib", "recognition", "adjacentResolver.ts"));

  test("keeps the V4.2 adjacent threshold and all 12 adjacent pairs", () => {
    assert.equal(ADJACENT_THRESHOLD, 0.15);
    assert.equal(ADJACENT_RULES.length, 12);
    assert.deepEqual(
      ADJACENT_RULES.map((rule) => [rule.personaA, rule.personaB]),
      [
        ["P01", "P12"],
        ["P04", "P17"],
        ["P05", "P07"],
        ["P02", "P22"],
        ["P15", "P33"],
        ["P09", "P34"],
        ["P14", "P35"],
        ["P27", "P35"],
        ["P11", "P21"],
        ["P25", "P33"],
        ["P10", "P29"],
        ["P03", "P36"],
      ],
    );
  });

  test("applies P01 vs P12 only when score gap is below 0.15", () => {
    const features = loadFixture("sample-features-m1.json");
    const close = resolveAdjacentPersona(features, { id: "P01", score: 0.7 }, { id: "P12", score: 0.6 });
    assert.equal(close.applied, true);
    assert.equal(close.selected_persona_id, "P01");

    const notClose = resolveAdjacentPersona(features, { id: "P01", score: 0.7 }, { id: "P12", score: 0.55 });
    assert.equal(notClose.applied, false);
    assert.equal(notClose.selected_persona_id, "P01");
  });

  test("covers V4.2 adjacent decisions for P05/P07, P11/P21, P10/P29", () => {
    const m5 = loadFixture("sample-features-m5.json");
    assert.equal(
      resolveAdjacentPersona(m5, { id: "P05", score: 0.62 }, { id: "P07", score: 0.6 }).selected_persona_id,
      "P07",
    );

    const m8 = loadFixture("sample-features-m8.json");
    const noFork = { ...m8, HEAD_LINE_END_FORK: 0 };
    assert.equal(
      resolveAdjacentPersona(noFork, { id: "P11", score: 0.6 }, { id: "P21", score: 0.58 }).selected_persona_id,
      "P21",
    );

    const m7 = loadFixture("sample-features-m7.json");
    assert.equal(
      resolveAdjacentPersona(m7, { id: "P10", score: 0.6 }, { id: "P29", score: 0.58 }).selected_persona_id,
      "P10",
    );
  });
};
