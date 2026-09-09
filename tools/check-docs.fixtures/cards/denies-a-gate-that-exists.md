# fixture — a card that denies a gate the requirement declares

<!--
  Point 7's negative control. The scorecard row below says a requirement has no gate; that
  requirement's own **Gate** field says otherwise, so the gate must reject this card. It is a
  card and not a requirement, which is why it stands in this subdirectory: the fixture loop
  for points 1–3 parses everything beside it as a requirement and would find none here.

  The claim is the one `docs/components/button.md` really carried, kept verbatim so the
  control fires on the sentence that was shipped rather than on an invented one.
-->

| criterion | evidence                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------- |
| RTL       | none — gap: [`req-token-logical`](../../../docs/requirements/tokens.md#req-token-logical) has no gate       |
