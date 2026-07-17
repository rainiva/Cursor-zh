const fixtureV1 =
  'const Ue=j?W?"":QoI:W?"":le?.text??"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"';

const fixtureRenamed =
  'W?"":ee?.text??"";let Fe;n[79]!==Re||n[80]!==o?(Fe=e$P(XUP(Re,o),Hs),n[79]=Re,n[80]=o,n[81]=Fe):Fe=n[81];const ze=Fe,Be=K?W?"tip-dismissed-exiting":"tip-dismissed"';

const fixtureSingleQuoted =
  "const Ue=j?W?'':QoI:W?'':le?.text??'',Pe=j?W?'tip-dismissed-exiting':'tip-dismissed'";

const fixtureWithoutOptionalChain =
  'const Ue=j?W?"":QoI:W?"":le.text||"",Pe=j?W?"tip-dismissed-exiting":"tip-dismissed"';

const fixtureReordered =
  'const Pe=j?W?"tip-dismissed-exiting":"tip-dismissed",Ue=j?W?"":QoI:W?"":le?.text??""';

module.exports = {
  fixtureV1,
  fixtureRenamed,
  fixtureSingleQuoted,
  fixtureWithoutOptionalChain,
  fixtureReordered,
};
