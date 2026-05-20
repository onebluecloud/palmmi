module.exports = ({ test, assert, loadFixture, root }) => {
  const path = require("node:path");
  const { matchPersona } = require(path.join(root, "lib", "recognition", "personaMatcher.ts"));

  test("applies cross-mother correction only with 20 percent higher persona score and mother score >= 50", () => {
    const result = matchPersona(loadFixture("sample-features-cross-mother.json"));

    assert.equal(result.initial_primary_persona.mother_type, "M1");
    assert.equal(result.primary_persona.mother_type, "M2");
    assert.equal(result.primary_persona.id, "P35");
    assert.equal(result.correction.cross_mother_checked, true);
    assert.equal(result.correction.cross_mother_applied, true);
    assert.equal(result.correction.cross_mother_detail.cross_mother, "M2");
    assert.ok(result.correction.cross_mother_detail.cross_persona_score > result.correction.cross_mother_detail.original_primary_persona_score * 1.2);
    assert.ok(result.correction.cross_mother_detail.cross_mother_score >= 50);
    assert.ok(result.primary_persona.reason_codes.includes("CROSS_MOTHER_CORRECTED"));
  });
};
