import { test } from "node:test";
import assert from "node:assert/strict";
import { explanationSteps } from "../src/lib/answer-explanation";
test("quoted sentence edits stay in one worked step, including contractions", () => {
  assert.deepEqual(
    explanationSteps(
      "'pianist. They were enthralled;' fixes both joins. The other choices leave a splice.",
    ),
    [
      "'pianist. They were enthralled;' fixes both joins.",
      "The other choices leave a splice.",
    ],
  );
  assert.deepEqual(
    explanationSteps(
      "“It can’t wait. We must go.” supplies two complete thoughts. Check the boundary.",
    ),
    [
      "“It can’t wait. We must go.” supplies two complete thoughts.",
      "Check the boundary.",
    ],
  );
  assert.deepEqual(
    explanationSteps("The writer's claim is limited. Don't broaden it."),
    ["The writer's claim is limited.", "Don't broaden it."],
  );
});
test("corrections keep specific evidence and remove answer-key boilerplate", () => {
  assert.deepEqual(
    explanationSteps(
      "She changes the caption after finding an uneven sample. The supported answer is “limits the claim to this group.” Reject choices that change the stated facts, exceed the evidence, or answer a different question.",
    ),
    ["She changes the caption after finding an uneven sample."],
  );
});
test("corrections preserve decimal calculations, punctuation rules and all authored reasoning", () => {
  assert.deepEqual(
    explanationSteps(
      "The rate is 2.5 mg/L. Divide 10 by 4 to get 2.5. Check both constraints.",
    ),
    [
      "The rate is 2.5 mg/L.",
      "Divide 10 by 4 to get 2.5.",
      "Check both constraints.",
    ],
  );
  assert.equal(
    explanationSteps(
      "A semicolon needs independent clauses on both sides; '; while' leaves a dependent clause.",
    ).length,
    1,
  );
});
