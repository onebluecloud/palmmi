module.exports = ({ test, assert, loadFixture, root }) => {
  const path = require("node:path");
  const { matchPersona } = require(path.join(root, "lib", "recognition", "personaMatcher.ts"));
  const { MOTHER_TO_PERSONAS } = require(path.join(root, "lib", "recognition", "personaCatalog.ts"));

  test("preserves the V4.2 8 mother to 36 persona mapping", () => {
    assert.deepEqual(MOTHER_TO_PERSONAS.M1.map((p) => p.id), ["P01", "P12", "P25", "P06", "P31"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M2.map((p) => p.id), ["P35", "P14", "P27", "P30"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M3.map((p) => p.id), ["P02", "P22", "P20", "P28"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M4.map((p) => p.id), ["P09", "P34", "P33", "P15", "P17"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M5.map((p) => p.id), ["P05", "P03", "P36", "P07"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M6.map((p) => p.id), ["P13", "P26", "P16", "P19"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M7.map((p) => p.id), ["P10", "P29", "P18", "P04"]);
    assert.deepEqual(MOTHER_TO_PERSONAS.M8.map((p) => p.id), ["P11", "P21", "P08", "P32", "P23", "P24"]);

    const allIds = Object.values(MOTHER_TO_PERSONAS).flat().map((p) => p.id);
    assert.equal(allIds.length, 36);
    assert.equal(new Set(allIds).size, 36);
  });

  test("selects primary mothers from their own candidate pools for all 8 fixtures", () => {
    for (const [file, expectedMother] of [
      ["sample-features-m1.json", "M1"],
      ["sample-features-m2.json", "M2"],
      ["sample-features-m3.json", "M3"],
      ["sample-features-m4.json", "M4"],
      ["sample-features-m5.json", "M5"],
      ["sample-features-m6.json", "M6"],
      ["sample-features-m7.json", "M7"],
      ["sample-features-m8.json", "M8"],
    ]) {
      const result = matchPersona(loadFixture(file));

      assert.equal(result.primary_mother.id, expectedMother, file);
      assert.equal(result.persona_candidate_pool_mother, expectedMother, file);
      assert.equal(result.debug.initial_pool_only, true, file);
      assert.ok(
        MOTHER_TO_PERSONAS[expectedMother].some((persona) => persona.id === result.initial_primary_persona.id),
        file,
      );
      assert.equal(result.top3.length, 3, file);
      for (const candidate of result.top3) {
        assert.ok(candidate.persona_id);
        assert.ok(candidate.name);
        assert.ok(candidate.mother_type);
        assert.equal(typeof candidate.score, "number");
        assert.ok(Array.isArray(candidate.reason_codes));
        assert.ok(Array.isArray(candidate.matched_features));
      }
    }
  });

  test("resolves a close Top1 and Top2 adjacent pair and marks low confidence", () => {
    const result = matchPersona(loadFixture("sample-features-close-top12.json"));

    assert.equal(result.primary_mother.id, "M2");
    assert.equal(result.primary_persona.id, "P35");
    assert.equal(result.top3[0].persona_id, "P35");
    assert.equal(result.correction.adjacent_checked, true);
    assert.equal(result.correction.adjacent_applied, true);
    assert.equal(result.is_low_confidence, true);
    assert.equal(result.status, "LOW_CONFIDENCE");
    assert.ok(result.primary_persona.reason_codes.includes("ADJACENT_RESOLVED"));
  });

  test("returns a retry result when no mother has two core supporting fields", () => {
    const result = matchPersona(loadFixture("sample-features-no-eligible.json"));

    assert.equal(result.status, "RETRY_REQUIRED");
    assert.equal(result.primary_mother, null);
    assert.deepEqual(result.error_codes, ["RULE_NO_ELIGIBLE_PRIMARY_MOTHER"]);
  });

  test("does not let a lower-scoring adjacent pair override the top in-pool persona", () => {
    const result = matchPersona(loadFixture("sample-features-adjacent-low-pair.json"));

    assert.equal(result.primary_mother.id, "M1");
    assert.equal(result.primary_persona.id, "P06");
    assert.equal(result.top3[0].persona_id, "P06");
  });
};
