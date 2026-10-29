window.__ModuleLoader__.load({id:'dsh-context-lite',factory:require=>{const React=require('react');const STYLE=".dcl-root{--dcl-bg:var(--dsw-alias-bg-base,#fff);--dcl-ink:var(--dsw-alias-label-primary,#0f1115);--dcl-muted:var(--dsw-alias-label-tertiary,#81858c);--dcl-border:var(--dsw-alias-border-l4,#8883);--dcl-soft:var(--dsw-alias-bg-layer-2,#f5f6f7);--dcl-base:#dce1e9;--dcl-history:#a9b3c4;--dcl-work:#8297b5;--dcl-prompt:#5b8def;--dcl-summary:#d6ab65;--dcl-final:#749b7c;color:var(--dcl-ink);background:var(--dcl-bg);font:13px/1.6 var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif);padding:18px 22px 36px;overflow:auto;min-height:0;height:100%;box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--dcl-border) transparent}\nbody[data-ds-dark-theme] .dcl-root{--dcl-base:#454b56;--dcl-history:#8896aa;--dcl-work:#a0b1ca;--dcl-prompt:#7aa7f7;--dcl-summary:#d7b37a;--dcl-final:#95b69d;--dcl-soft:var(--dsw-alias-bg-layer-2,#232324)}\n.dcl-root *{box-sizing:border-box}.dcl-root button,.dcl-root summary{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}.dcl-root button{border:0;background:transparent;padding:0}.dcl-root button:focus-visible,.dcl-root summary:focus-visible{outline:2px solid #4176e6;outline-offset:3px}.dcl-root strong{font-weight:500}.dcl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}.dcl-top>span{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:500}.dcl-root .dcl-icon{border-radius:50%;display:grid;place-items:center;width:26px;height:26px;color:var(--dcl-muted);font-size:17px;flex-shrink:0}.dcl-icon:hover{background:var(--dcl-soft)}\n.dcl-timeline{margin-left:2px}.dcl-round{position:relative;border-left:1px solid var(--dcl-border);padding:0 0 34px 20px}.dcl-round:before{position:absolute;content:'';width:7px;height:7px;left:-4px;top:9px;border:1px solid var(--dcl-muted);background:var(--dcl-bg);border-radius:50%;opacity:.55}.dcl-round:focus-within:before{background:#4176e6;border-color:#4176e6;opacity:1}.dcl-heading{display:flex;gap:8px;align-items:center;margin-bottom:15px;min-height:22px}.dcl-number{font-size:10px;color:var(--dcl-muted);letter-spacing:1px}.dcl-root .dcl-round-toggle{display:flex;align-items:center;gap:8px;flex:1;min-width:0;text-align:left}.dcl-round-title{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.dcl-chevron{margin-left:auto;color:var(--dcl-muted);display:flex;transition:transform 200ms var(--ds-ease-in-out,ease)}.dcl-status{white-space:nowrap;color:#8a5c20;background:#fef5e7;border-radius:4px;padding:0 4px;font-size:10px}.dcl-status[data-status=running]{color:#4176e6;background:#edf3fe}\n.dcl-metrics{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px}.dcl-size{white-space:nowrap;display:flex;align-items:baseline;gap:3px}.dcl-size strong{font-size:22px;font-variant-numeric:tabular-nums;letter-spacing:-.6px;line-height:1.2}.dcl-capacity,.dcl-caption{color:var(--dcl-muted);font-size:10px}.dcl-caption{margin-left:3px}.dcl-added{background:color-mix(in srgb,#4176e6 6%,var(--dcl-bg));color:#638bd2;border-radius:12px;padding:1px 6px;font-variant-numeric:tabular-nums;white-space:nowrap}.dcl-ribbon{display:flex;gap:2px;border-radius:6px;min-height:28px;overflow:hidden;flex-wrap:nowrap}.dcl-root .dcl-segment{min-width:7px;flex-basis:0;flex-shrink:1;border-radius:2px;background:var(--source);transition:opacity 100ms ease,filter 100ms ease;position:relative}.dcl-ribbon:has(.dcl-segment:hover) .dcl-segment:not(:hover),.dcl-ribbon:has(.dcl-segment:focus-visible) .dcl-segment:not(:focus-visible){opacity:.45;filter:saturate(.7)}.dcl-root .dcl-segment:focus-visible{outline-offset:-2px;outline-color:var(--dcl-ink)}\n.dcl-audit,.dcl-info{animation:dcl-enter 180ms var(--ds-ease-in-out,ease);margin-top:16px;border:1px solid var(--dcl-border);border-radius:12px;padding:14px;background:var(--dcl-soft)}.dcl-detail-shell{margin-top:16px;overflow:clip;transition:height 220ms var(--ds-ease-in-out,ease);overflow-anchor:none}.dcl-detail{border:1px solid var(--dcl-border);border-left:3px solid var(--source);border-radius:12px;padding:14px;background:var(--dcl-soft);display:flow-root;min-width:0}.dcl-detail header strong{overflow-wrap:anywhere;min-width:0}.dcl-loading{font-size:11px;color:var(--dcl-muted)}.dcl-detail header{display:flex;align-items:center;justify-content:space-between}.dcl-body{white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:12px;line-height:1.7;max-width:100%;margin:9px 0;color:var(--dcl-ink)}.dcl-small,.dcl-source-meta{font-size:11px;color:var(--dcl-muted);overflow-wrap:anywhere}.dcl-source-meta{display:flex;flex-wrap:wrap;gap:6px;justify-content:space-between}.dcl-source-record+.dcl-source-record{margin-top:15px;padding-top:15px;border-top:1px solid var(--dcl-border)}.dcl-source-record .dcl-source-record{margin:10px 0 0 6px;padding:10px;border:1px solid var(--dcl-border);border-radius:8px}.dcl-root .dcl-link{color:var(--dsw-alias-brand-primary,#4176e6);font-size:12px;text-align:left;padding:4px 2px}.dcl-link:disabled{opacity:.5;cursor:default}.dcl-root details{margin:10px 0;padding-inline-start:16px;border-inline-start:1px solid var(--dcl-border);min-width:0}.dcl-root details>summary{margin-inline-start:-16px;padding-inline-start:0;list-style-position:inside;overflow-wrap:anywhere}.dcl-root details>details{margin-inline-start:0}.dcl-root details>summary+*{margin-top:8px}.dcl-provenance p{margin:3px 0}.dcl-record-origin{margin-bottom:10px}.dcl-record-origin>strong{font-size:12px}.dcl-files{padding-inline-start:16px;margin:4px 0;font-size:11px;color:var(--dcl-muted);overflow-wrap:anywhere}.dcl-root summary{color:var(--dcl-muted);font-size:12px}.dcl-ref-list{display:flex;flex-wrap:wrap;gap:4px}.dcl-info{margin:0 0 24px}.dcl-info p{font-size:12px;color:var(--dcl-muted);margin:8px 0}.dcl-empty{color:var(--dcl-muted);font-size:13px;padding:30px 0}\n.dcl-audit-metrics{display:flex;flex-direction:column;gap:4px;font-size:12px}.dcl-root .dcl-event{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px;border:1px solid var(--dcl-border);border-left:3px solid var(--source);border-radius:8px;padding:10px;margin:8px 0;width:100%;text-align:left;background:var(--dcl-bg)}.dcl-event span,.dcl-event small{color:var(--dcl-muted);font-size:11px}.dcl-event small{grid-column:1/-1;overflow-wrap:anywhere}.dcl-tooltip{position:fixed;z-index:1000;pointer-events:none;max-width:240px;width:max-content;border-radius:8px;padding:9px 12px;background:#2c2c2e;color:white;box-shadow:0 4px 18px #0002;animation:dcl-enter 100ms ease;line-height:1.6}.dcl-tooltip strong{display:flex;gap:7px;align-items:center;font-weight:500}.dcl-tooltip i{display:block;width:7px;height:7px;border-radius:2px}.dcl-tooltip span{display:block;font-size:11px;color:#d2d5dc}\n@keyframes dcl-enter{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}@media(max-width:420px){.dcl-root{padding:16px 16px 28px}.dcl-round{padding-left:16px}.dcl-size strong{font-size:21px}}@media(prefers-reduced-motion:reduce){.dcl-root *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}\n\n.dcl-ribbon{overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;height:28px}.dcl-tooltip{overflow-wrap:anywhere}\n\n.dcl-detail .dcl-body{max-height:360px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dcl-border) transparent}.dcl-tip-action{opacity:.8}.dcl-provenance{margin:5px 0 10px}.dcl-root details[open]>summary{color:var(--dcl-ink)}\n";var __ContextLiteClient = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client.js
  var client_exports = {};
  __export(client_exports, {
    apply: () => apply,
    inject: () => inject
  });

  // src/i18n.js
  var zh = {
    "unavailable": "\u4E0A\u4E0B\u6587\u670D\u52A1\u672A\u542F\u7528\u6216\u6B63\u5728\u8FDE\u63A5\u3002",
    "tab": "\u4E0A\u4E0B\u6587",
    "guide": "\u65F6\u95F4\u7EBF\u4E0E\u4E0A\u4E0B\u6587\u6765\u6E90",
    "loading": "\u6B63\u5728\u8BFB\u53D6\u4E0A\u4E0B\u6587\u2026",
    "empty": "\u53D1\u9001\u4E00\u6761\u6D88\u606F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u4E0A\u4E0B\u6587\u65F6\u95F4\u7EBF\u3002",
    "retry": "\u91CD\u65B0\u8BFB\u53D6",
    "error": "\u4E0A\u4E0B\u6587\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6",
    "close": "\u6536\u8D77\u8BE6\u60C5",
    "window": "\u7A97\u53E3",
    "round": "\u672C\u8F6E",
    "unknown": "\u5BB9\u91CF\u672A\u77E5",
    "interrupted": "\u5DF2\u4E2D\u65AD",
    "running": "\u8FDB\u884C\u4E2D",
    "info": "\u7EDF\u8BA1\u53E3\u5F84\u4E0E\u8986\u76D6\u8303\u56F4",
    "estimate": "\u7EC4\u6210\u4E0E\u7A97\u53E3\u5927\u5C0F\u4E3A\u4F30\u7B97\uFF1B\u5C0F\u8272\u5757\u4FDD\u7559\u6700\u4F4E\u53EF\u89C1\u5BBD\u5EA6\u3002",
    "more": "\u7EE7\u7EED\u8BFB\u53D6",
    "origin": "\u539F\u59CB\u6765\u6E90",
    "summary": "\u67E5\u770B\u538B\u7F29\u6458\u8981\u4E0E\u6E90\u6D88\u606F",
    "request": "\u903B\u8F91\u8BF7\u6C42\u8BE6\u60C5",
    "history": "\u8986\u76D6\u8F6E\u6B21",
    "seq": "\u65E5\u5FD7",
    "raw": "\u67E5\u770B\u6E90\u8BB0\u5F55",
    "textMore": "\u8BFB\u53D6\u540E\u7EED\u6B63\u6587",
    "boundary": "\u56DE\u5408\u7ED3\u675F\u72B6\u6001",
    "sourceUser": "\u7528\u6237",
    "sourceModel": "\u6A21\u578B",
    "sourceScript": "\u811A\u672C \xB7 {name}",
    "sourcePlugin": "\u63D2\u4EF6 \xB7 {name}",
    "sourceDsh": "DSH \xB7 {name}",
    "sourceTool": "\u5DE5\u5177 \xB7 {name}",
    "sourceToolUnknown": "\u5DE5\u5177",
    "sourceInstructions": "\u6307\u4EE4\u6587\u4EF6",
    "sourceInstructionFiles": "\u6307\u4EE4\u6587\u4EF6 \xB7 {names}",
    "sourceInstructionFilesMore": "\u6307\u4EE4\u6587\u4EF6 \xB7 {names} \u7B49",
    "sourceSystem": "DSH \xB7 \u7CFB\u7EDF\u63D0\u793A\u8BCD",
    "sourceRuntime": "DSH \xB7 \u8FD0\u884C\u73AF\u5883",
    "sourceSkills": "DSH \xB7 \u6280\u80FD\u76EE\u5F55",
    "sourceTime": "DSH \xB7 \u65F6\u95F4\u4E0A\u4E0B\u6587",
    "sourceCompaction": "DSH \xB7 \u4E0A\u4E0B\u6587\u538B\u7F29",
    "sourceTools": "DSH \xB7 \u5DE5\u5177\u5B9A\u4E49",
    "sourceUnconfirmed": "\u6765\u6E90\u65B9\u672A\u786E\u8BA4",
    "sourceUnknown": "\u6765\u6E90\u65B9\u672A\u8BB0\u5F55",
    "methodInput": "\u4F1A\u8BDD\u8F93\u5165 / \u4E2D\u9014\u5F15\u5BFC",
    "methodOutput": "\u6A21\u578B\u8F93\u51FA",
    "methodInject": "\u4E0A\u4E0B\u6587\u6CE8\u5165",
    "methodSteer": "\u4E2D\u9014\u5F15\u5BFC",
    "methodFollowup": "\u4F1A\u8BDD\u8F93\u5165",
    "methodEnqueue": "\u6D88\u606F\u5165\u961F",
    "methodInbox": "\u4E0A\u4E0B\u6587\u5165\u961F",
    "methodReplace": "\u961F\u5217\u5185\u5BB9\u66FF\u6362",
    "methodToolResult": "\u5DE5\u5177\u7ED3\u679C",
    "methodSection": "\u7CFB\u7EDF\u63D0\u793A\u8BCD\u6CE8\u518C",
    "methodContext": "\u8FD0\u884C\u73AF\u5883\u4E0A\u4E0B\u6587\u6CE8\u518C",
    "methodTools": "\u5DE5\u5177\u6CE8\u518C",
    "methodRecorded": "\u8FDB\u5165\u65B9\u5F0F\u5DF2\u8BB0\u5F55",
    "methodUnknown": "\u8FDB\u5165\u65B9\u5F0F\u672A\u8BB0\u5F55",
    "methodInstructions": "\u9879\u76EE\u6307\u4EE4\u52A0\u8F7D",
    "methodSystem": "\u7CFB\u7EDF\u63D0\u793A\u8BCD\u7EC4\u88C5",
    "methodSnapshot": "\u8FD0\u884C\u73AF\u5883\u5FEB\u7167",
    "methodSkills": "\u6280\u80FD\u76EE\u5F55\u52A0\u8F7D",
    "methodTime": "\u65F6\u95F4\u5FEB\u7167",
    "methodCompaction": "\u538B\u7F29\u66FF\u6362",
    "methodRequestTools": "\u8BF7\u6C42\u5DE5\u5177\u5B9A\u4E49",
    "methodWork": "\u6A21\u578B\u8F93\u51FA\u4E0E\u5DE5\u5177\u7ED3\u679C",
    "methodHistory": "\u5386\u53F2\u539F\u6587\u6CBF\u7528",
    "segmentBase": "\u5BBF\u4E3B\u57FA\u7840\u4E0A\u4E0B\u6587",
    "segmentSummary": "\u5386\u53F2\u538B\u7F29\u4FE1\u606F",
    "segmentHistory": "\u5386\u53F2\u672A\u538B\u7F29\u4FE1\u606F",
    "segmentPrompt": "\u7528\u6237 \xB7 \u672C\u8F6E\u8F93\u5165",
    "segmentSteering": "\u7528\u6237 \xB7 \u4E2D\u9014\u5F15\u5BFC",
    "segmentWork": "\u6A21\u578B\u5DE5\u4F5C\u4E0A\u4E0B\u6587",
    "segmentFinal": "\u6C47\u62A5",
    "roundWork": "\u672C\u8F6E\u5DE5\u4F5C",
    "attachmentsInput": "\u56FE\u7247\u6216\u9644\u4EF6\u8F93\u5165",
    "betweenRounds": "\u8F6E\u95F4\u4E0A\u4E0B\u6587\u66F4\u65B0",
    "sourceInfo": "\u6765\u6E90\u4FE1\u606F",
    "module": "\u6A21\u5757\uFF1A{name}",
    "loader": "\u52A0\u8F7D\u65B9\uFF1A{name}",
    "admissionApi": "\u8FDB\u5165\u63A5\u53E3\uFF1A{name}",
    "registryInventory": "\u73B0\u5B58\u6CE8\u518C\u8868\u8865\u5F55",
    "evidenceRuntime": "\u81EA\u52A8\u91C7\u96C6\uFF1A\u5DF2\u89C2\u5BDF\u5230\u6D88\u606F\u8FDB\u5165\u3002",
    "evidenceRegistration": "\u81EA\u52A8\u91C7\u96C6\uFF1A\u4F9D\u636E\u5F53\u65F6\u7684\u5DE5\u5177\u6CE8\u518C\u5173\u8054\u3002",
    "evidenceMapping": "\u8C03\u7528\u65B9\u4F9D\u636E\u5DF2\u6838\u5BF9\u7684\u4F1A\u8BDD\u6620\u5C04\uFF1B\u539F\u59CB\u65E5\u5FD7\u672A\u8BB0\u5F55\u3002",
    "evidenceDeclared": "\u8C03\u7528\u65B9\u4E0E\u8FDB\u5165\u63A5\u53E3\u7531\u63D0\u4F9B\u65B9\u8BB0\u5F55\u3002",
    "inheritedSession": "\u7EE7\u627F\u81EA\u4F1A\u8BDD {session}",
    "prunedResult": "\u5DE5\u5177\u7ED3\u679C\u5DF2\u4FEE\u526A\uFF08\u4E0D\u662F\u6A21\u578B\u6458\u8981\uFF09 \xB7 #{seq}",
    "attachments": "\u9644\u4EF6\u4E0E\u7ED3\u6784\u5316\u5185\u5BB9\u5F15\u7528",
    "toolCall": "{name} \xB7 \u5DE5\u5177\u8C03\u7528",
    "summaryInput": "\u6458\u8981\u8C03\u7528\u7684\u8F93\u5165\u8303\u56F4",
    "summaryRefs": "\u6E90\u6D88\u606F\uFF1A{sources}\uFF1B\u6B64\u524D\u7CFB\u7EDF\u8282\u70B9\uFF1A{systems}",
    "summaryInputNote": "\u6E90\u6D88\u606F\u96C6\u5408\u53EF\u6838\u5BF9\uFF1B\u6458\u8981\u6307\u4EE4\u6A21\u677F\u672A\u5B8C\u6574\u6301\u4E45\u8BB0\u5F55\uFF0C\u4E0D\u80FD\u58F0\u79F0\u8FD9\u662F\u5B8C\u6574\u7684\u6458\u8981\u8C03\u7528\u8F93\u5165\u3002",
    "attemptNote": "\u8BE5\u5C1D\u8BD5\u6CA1\u6709\u751F\u6210\u4FDD\u7559\u6D88\u606F\uFF0C\u4E0D\u8BA1\u5165\u4E0A\u4E0B\u6587\u7EC4\u6210\u3002",
    "referenceTruncated": "\u5F15\u7528\u9884\u89C8\u5DF2\u622A\u65AD\u3002",
    "limitEstimate": "\u5206\u9879\u4E0E\u7A97\u53E3\u5927\u5C0F\u91C7\u7528 DSH \u56FA\u5B9A\u4F30\u7B97\uFF0C\u4E0D\u662F\u63D0\u4F9B\u65B9\u8D26\u5355\u3002",
    "limitRequest": "\u8BF7\u6C42\u8BE6\u60C5\u6309\u54CD\u5E94/\u5C1D\u8BD5\u7ED3\u7B97\u524D\u65E5\u5FD7\u91CD\u5EFA\uFF1B\u5BBF\u4E3B\u672A\u6301\u4E45\u8BB0\u5F55\u6BCF\u6B21\u9002\u914D\u540E\u7684\u7EBF\u7F06\u8BF7\u6C42\u53CA\u6240\u6709\u5185\u90E8\u91CD\u8BD5\u3002",
    "limitSummary": "\u6458\u8981\u6765\u6E90\u8986\u76D6\u4E0D\u8BC1\u660E\u5176\u4E2D\u6BCF\u4E2A\u7EC6\u8282\u4ECD\u88AB\u4FDD\u7559\uFF1B\u5916\u90E8\u7A97\u53E3\u8EAB\u4EFD\u4EC5\u5728\u6765\u6E90\u6709\u8BB0\u5F55\u65F6\u663E\u793A\u3002",
    "switching": "\u6B63\u5728\u5207\u6362\u81F3 {name}\u2026",
    "logicalInputNote": "\u6309\u7ED3\u7B97\u524D\u65E5\u5FD7\u91CD\u5EFA\u7684\u903B\u8F91\u8F93\u5165\uFF0C\u4E0D\u4EE3\u8868\u63D0\u4F9B\u65B9\u9002\u914D\u540E\u7684\u7CBE\u786E\u8BF7\u6C42\u3002",
    "requestUsage": "\u8BF7\u6C42\u8BB0\u5F55\u4E0E\u7528\u91CF",
    "expandRound": "\u5C55\u5F00\u7B2C {round} \u8F6E\u8BE6\u60C5",
    "collapseRound": "\u6536\u8D77\u7B2C {round} \u8F6E\u8BE6\u60C5",
    "roundComposition": "\u7B2C {round} \u8F6E\u4E0A\u4E0B\u6587\u7EC4\u6210",
    "inspectSource": "{name}\uFF1A\u67E5\u770B\u5185\u5BB9\u4E0E\u6765\u6E90",
    "retainedCount": "\u4FDD\u7559 \u2248 {count}",
    "newCount": "\u672C\u8F6E\u65B0\u589E +{count}",
    "netChange": "\u51C0\u53D8\u5316 {count}",
    "newBasis": "\u65B0\u589E\u4E3A\u672C\u8F6E\u5F15\u5165\u4E14\u4ECD\u4FDD\u7559\u7684\u5185\u5BB9\uFF1B\u4E0D\u542B\u590D\u7528\u5386\u53F2\u4E0E\u57FA\u7840\u6307\u4EE4\uFF0C\u548C\u538B\u7F29\u540E\u7684\u51C0\u53D8\u5316\u5206\u5F00\u3002",
    "toolDefinitions": "\u5DE5\u5177\u5B9A\u4E49",
    "sourceChanges": "\u6765\u6E90\u53D8\u5316",
    "changeAdded": "\u65B0\u589E",
    "changeRemoved": "\u79FB\u51FA",
    "changeRetained": "\u6CBF\u7528",
    "changeTransient": "\u672C\u8F6E\u66FE\u51FA\u73B0\uFF0C\u5F53\u524D\u5DF2\u79FB\u51FA",
    "sourceLog": "\u65E5\u5FD7 {refs}",
    "earlierRounds": "\u8BFB\u53D6\u66F4\u65E9\u7684\u56DE\u5408 \xB7 {count}",
    "continuousItems": "{count} \u6761\u8FDE\u7EED\u5185\u5BB9 \xB7 \u70B9\u51FB\u67E5\u770B",
    "inspectContent": "\u70B9\u51FB\u67E5\u770B\u5185\u5BB9\u4E0E\u6765\u6E90",
    "collectionStatus": "\u81EA\u52A8\u6765\u6E90\u91C7\u96C6\uFF1A{state} \xB7 {count} \u6B21\u5165\u53E3 \xB7 {storage}",
    "enabled": "\u5DF2\u542F\u7528",
    "disabled": "\u672A\u542F\u7528",
    "hostStorage": "\u5143\u6570\u636E\u5DF2\u63A5\u5165\u5BBF\u4E3B\u5B58\u50A8",
    "memoryStorage": "\u5143\u6570\u636E\u6682\u5B58\u5185\u5B58",
    "collectionPartial": "\u90E8\u5206\u5165\u53E3\u672A\u80FD\u91C7\u96C6",
    "storageError": "\u5143\u6570\u636E\u5B58\u50A8\u5F02\u5E38",
    "coverageNote": "\u73B0\u5B58\u6CE8\u518C\u9879\u5DF2\u8865\u67E5\uFF1B\u672A\u89C2\u5BDF\u5230\u7684\u8C03\u7528\u65B9\u548C\u5DF2\u79FB\u9664\u5386\u53F2\u4ECD\u53EF\u80FD\u7F3A\u5931\u3002",
    "sessionLabel": "\u4F1A\u8BDD\uFF1A{session}",
    "formatLocale": "zh-CN",
    "statusError": "\u6267\u884C\u5931\u8D25",
    "statusBlocked": "\u6267\u884C\u53D7\u963B",
    "statusMaxTokens": "\u8F93\u51FA\u5DF2\u8FBE\u4E0A\u9650",
    "statusForked": "\u5206\u652F\u8FB9\u754C",
    "statusCancelled": "\u5DF2\u53D6\u6D88",
    "statusRecovered": "\u6267\u884C\u4E2D\u65AD",
    "statusUnknown": "\u8FB9\u754C\u5F85\u786E\u8BA4",
    "requestResponse": "\u54CD\u5E94",
    "requestAttempt": "\u5C1D\u8BD5",
    "requestInterrupted": "\u5DF2\u4E2D\u65AD",
    "step": "\u6B65\u9AA4 {step}",
    "errorInvalidQuery": "\u67E5\u8BE2\u53C2\u6570\u4E0D\u6B63\u786E",
    "errorRequestMissing": "\u8BF7\u6C42\u8BB0\u5F55\u4E0D\u5B58\u5728",
    "errorSourceMissing": "\u6765\u6E90\u8BB0\u5F55\u4E0D\u5B58\u5728",
    "errorCancelled": "\u67E5\u8BE2\u5DF2\u53D6\u6D88",
    "errorSessionMissing": "\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u79FB\u9664",
    "errorReconstruction": "\u65E5\u5FD7\u65E0\u6CD5\u5B8C\u6574\u91CD\u5EFA\uFF1B\u6B64\u4F1A\u8BDD\u7684\u8BB0\u5F55\u683C\u5F0F\u6216\u6765\u6E90\u89E3\u91CA\u5668\u53EF\u80FD\u4E0D\u53D7\u652F\u6301\u3002",
    "errorServiceDisabled": "\u4E0A\u4E0B\u6587\u670D\u52A1\u672A\u542F\u7528\uFF0C\u8BF7\u5728\u63D2\u4EF6\u9875\u542F\u7528 Context Lite\u3002",
    "errorSessionMismatch": "\u4F1A\u8BDD\u6807\u8BC6\u4E0D\u4E00\u81F4\u3002",
    "errorHttp": "\u8BF7\u6C42\u5931\u8D25\uFF08HTTP {status}\uFF09\u3002",
    "errorAccess": "\u65E0\u6CD5\u8BBF\u95EE\uFF0C\u8BF7\u68C0\u67E5 DSH \u767B\u5F55\u72B6\u6001\u4E0E\u4F1A\u8BDD\u8BBF\u95EE\u6743\u9650\u3002",
    "errorInvalidResponse": "\u4E0A\u4E0B\u6587\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6CD5\u8BFB\u53D6\u7684\u54CD\u5E94\u3002",
    "errorNetwork": "\u4E0A\u4E0B\u6587\u670D\u52A1\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002"
  };
  var en = {
    "unavailable": "Context service is disabled or connecting.",
    "tab": "Context",
    "guide": "Timeline and context provenance",
    "loading": "Reading context\u2026",
    "empty": "Send a message to see its context timeline.",
    "retry": "Retry",
    "error": "Context is unavailable",
    "close": "Close details",
    "window": "window",
    "round": "new",
    "unknown": "capacity unknown",
    "interrupted": "Interrupted",
    "running": "Running",
    "info": "Measurement and coverage",
    "estimate": "Estimates; small sources keep a minimum visible width.",
    "more": "Load more",
    "origin": "Original source",
    "summary": "Summary and source messages",
    "request": "Logical request details",
    "history": "Source rounds",
    "seq": "Log",
    "raw": "Open source event",
    "textMore": "Read remaining text",
    "boundary": "End-of-round state",
    "sourceUser": "User",
    "sourceModel": "Model",
    "sourceScript": "Script \xB7 {name}",
    "sourcePlugin": "Plugin \xB7 {name}",
    "sourceDsh": "DSH \xB7 {name}",
    "sourceTool": "Tool \xB7 {name}",
    "sourceToolUnknown": "Tool",
    "sourceInstructions": "Instruction files",
    "sourceInstructionFiles": "Instruction files \xB7 {names}",
    "sourceInstructionFilesMore": "Instruction files \xB7 {names} and more",
    "sourceSystem": "DSH \xB7 System prompt",
    "sourceRuntime": "DSH \xB7 Runtime context",
    "sourceSkills": "DSH \xB7 Skill catalog",
    "sourceTime": "DSH \xB7 Time context",
    "sourceCompaction": "DSH \xB7 Compaction",
    "sourceTools": "DSH \xB7 Tool definitions",
    "sourceUnconfirmed": "Source owner unconfirmed",
    "sourceUnknown": "Source owner not recorded",
    "methodInput": "User input / steering",
    "methodOutput": "Model output",
    "methodInject": "Context injection",
    "methodSteer": "Steering",
    "methodFollowup": "Conversation input",
    "methodEnqueue": "Message enqueue",
    "methodInbox": "Context enqueue",
    "methodReplace": "Inbox replacement",
    "methodToolResult": "Tool result",
    "methodSection": "System prompt registration",
    "methodContext": "Runtime context registration",
    "methodTools": "Tool registration",
    "methodRecorded": "Admission method recorded",
    "methodUnknown": "Admission method not recorded",
    "methodInstructions": "Project instruction loading",
    "methodSystem": "System prompt assembly",
    "methodSnapshot": "Runtime context snapshot",
    "methodSkills": "Skill catalog loading",
    "methodTime": "Time snapshot",
    "methodCompaction": "Compaction replacement",
    "methodRequestTools": "Request tool definitions",
    "methodWork": "Model output and tool results",
    "methodHistory": "Retained original history",
    "segmentBase": "Host base context",
    "segmentSummary": "Compressed history",
    "segmentHistory": "Uncompressed history",
    "segmentPrompt": "User \xB7 Prompt",
    "segmentSteering": "User \xB7 Steering",
    "segmentWork": "Model working context",
    "segmentFinal": "Final response",
    "roundWork": "Round activity",
    "attachmentsInput": "Image or attachment input",
    "betweenRounds": "Context update between rounds",
    "sourceInfo": "Source information",
    "module": "Module: {name}",
    "loader": "Loaded by: {name}",
    "admissionApi": "Admission API: {name}",
    "registryInventory": "Existing registry inventory",
    "evidenceRuntime": "Automatically collected: message admission observed.",
    "evidenceRegistration": "Automatically collected: linked to the tool registration at that time.",
    "evidenceMapping": "Owner supplied by a verified session mapping; absent from the original log.",
    "evidenceDeclared": "Owner and admission API declared by the provider.",
    "inheritedSession": "Inherited from session {session}",
    "prunedResult": "Tool result pruned (not a model summary) \xB7 #{seq}",
    "attachments": "Attachments and structured references",
    "toolCall": "{name} \xB7 Tool call",
    "summaryInput": "Summary input scope",
    "summaryRefs": "Source messages: {sources}; earlier system nodes: {systems}",
    "summaryInputNote": "The source message set can be checked. The summary instruction template was not fully recorded, so this is not the complete summarization input.",
    "attemptNote": "This attempt produced no retained message and is excluded from context composition.",
    "referenceTruncated": "Reference preview truncated.",
    "limitEstimate": "Composition and window size use DSH fixed estimates, not provider billing.",
    "limitRequest": "Request details reconstruct the log before response/attempt settlement. The host does not record every adapted wire request or internal retry.",
    "limitSummary": "Summary coverage does not prove every detail was retained. External window identity is shown only when recorded.",
    "switching": "Switching to {name}\u2026",
    "logicalInputNote": "Logical input reconstructed before settlement, not the exact provider-adapted request.",
    "requestUsage": "Request record and usage",
    "expandRound": "Expand round {round} details",
    "collapseRound": "Collapse round {round} details",
    "roundComposition": "Round {round} context composition",
    "inspectSource": "{name}: inspect content and source",
    "retainedCount": "Retained \u2248 {count}",
    "newCount": "Added this round +{count}",
    "netChange": "Net change {count}",
    "newBasis": "Added context was introduced this round and remains retained. It excludes reused history and base instructions, and differs from net change after compaction.",
    "toolDefinitions": "Tool definitions",
    "sourceChanges": "Source changes",
    "changeAdded": "Added",
    "changeRemoved": "Removed",
    "changeRetained": "Retained",
    "changeTransient": "Present earlier this round, now removed",
    "sourceLog": "Log {refs}",
    "earlierRounds": "Load earlier rounds \xB7 {count}",
    "continuousItems": "{count} consecutive items \xB7 Click to inspect",
    "inspectContent": "Click to inspect content and source",
    "collectionStatus": "Automatic provenance: {state} \xB7 admissions: {count} \xB7 {storage}",
    "enabled": "enabled",
    "disabled": "disabled",
    "hostStorage": "metadata in host storage",
    "memoryStorage": "metadata in memory",
    "collectionPartial": "some entry points were not captured",
    "storageError": "metadata storage error",
    "coverageNote": "Existing registrations have been inventoried. Unobserved owners and removed history may still be missing.",
    "sessionLabel": "Session: {session}",
    "formatLocale": "en",
    "statusError": "Failed",
    "statusBlocked": "Blocked",
    "statusMaxTokens": "Output limit reached",
    "statusForked": "Fork boundary",
    "statusCancelled": "Cancelled",
    "statusRecovered": "Execution interrupted",
    "statusUnknown": "Boundary unconfirmed",
    "requestResponse": "Response",
    "requestAttempt": "Attempt",
    "requestInterrupted": "Interrupted",
    "step": "Step {step}",
    "errorInvalidQuery": "Invalid query parameters.",
    "errorRequestMissing": "Request record not found.",
    "errorSourceMissing": "Source record not found.",
    "errorCancelled": "Query cancelled.",
    "errorSessionMissing": "Session not found or removed.",
    "errorReconstruction": "The log cannot be fully reconstructed. Its format or source interpreter may be unsupported.",
    "errorServiceDisabled": "Context service is disabled. Enable Context Lite in the plugin manager.",
    "errorSessionMismatch": "Session identity mismatch.",
    "errorHttp": "Request failed (HTTP {status}).",
    "errorAccess": "Access denied. Check your DSH sign-in and session access.",
    "errorInvalidResponse": "The context service returned an unreadable response.",
    "errorNetwork": "Could not connect to the context service. Please retry."
  };
  var localized = (value, t, field = "title") => {
    const spec = value?.[`${field}Label`];
    return spec ? t(spec.key, spec.params) : value?.[field] || "";
  };
  var errorText = (error, t) => error?.code ? t(error.code, error.params) : error?.name === "TypeError" ? t("errorNetwork") : error?.message || String(error || "");

  // src/client.js
  var { createElement: h, useState, useEffect, useRef, useId, useCallback, useLayoutEffect } = React;
  var inject = ["slots", "locale", "sidebarRightTabs", "sidebarRight"];
  var NS = "contextLite";
  var serviceAvailable = true;
  var availabilityListeners = /* @__PURE__ */ new Set();
  var subscribeAvailability = (listener) => {
    availabilityListeners.add(listener);
    return () => availabilityListeners.delete(listener);
  };
  var availabilitySnapshot = () => serviceAvailable;
  function setAvailability(value) {
    if (value === serviceAvailable) return;
    serviceAvailable = value;
    for (const listener of availabilityListeners) listener();
  }
  var short = (n) => n == null ? "?" : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(n);
  var fmt = (n, t) => new Intl.NumberFormat(t("formatLocale")).format(n);
  var hues = { base: "var(--dcl-base)", history: "var(--dcl-history)", summary: "var(--dcl-summary)", prompt: "var(--dcl-prompt)", work: "var(--dcl-work)", final: "var(--dcl-final)" };
  function color(s) {
    if (hues[s.type]) return hues[s.type];
    let hash = 0;
    for (const c of s.sourceKey) hash = Math.imul(hash, 31) + c.charCodeAt(0) >>> 0;
    return `hsl(${hash % 360} 38% 62%)`;
  }
  function Icon() {
    return h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true }, h("path", { d: "M7 4v16M12 6h8M12 12h6M12 18h8", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }), ...[6, 12, 18].map((y) => h("circle", { key: y, cx: 5, cy: y, r: 1.5, fill: "currentColor" })));
  }
  async function query(sessionId, params, signal) {
    const q = new URLSearchParams({ sessionId, ...params });
    const response = await fetch(`/api/dsh-context-lite/audit?${q}`, { signal, cache: "no-store", credentials: "same-origin" });
    const fail = (code, params2) => Object.assign(new Error(code), { code, params: params2 });
    if (response.status === 404 && !response.headers.get("content-type")?.includes("application/json")) {
      setAvailability(false);
      throw fail("errorServiceDisabled");
    }
    if (response.status === 401 || response.status === 403) throw fail("errorAccess");
    if (!response.headers.get("content-type")?.includes("application/json")) throw fail("errorHttp", { status: response.status });
    let data;
    try {
      data = await response.json();
    } catch {
      throw fail("errorInvalidResponse");
    }
    if (!response.ok || !data.ok) throw fail(data.errorKey || "errorHttp", { status: response.status });
    if (data.value?.sessionId && data.value.sessionId !== sessionId) throw fail("errorSessionMismatch");
    setAvailability(true);
    return data.value;
  }
  function SourceEvent({ item, read, t, depth = 0, showProvenance = true }) {
    const [children, setChildren] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [pages, setPages] = useState([]);
    const life = useRef(null);
    useEffect(() => {
      life.current = new AbortController();
      return () => life.current.abort();
    }, []);
    const load = async (seq) => {
      setBusy(true);
      try {
        const value = await read({ kind: "event", seq }, life.current.signal);
        if (!life.current.signal.aborted) setChildren([value]);
      } catch (e) {
        if (!life.current.signal.aborted) setError(e);
      } finally {
        if (!life.current.signal.aborted) setBusy(false);
      }
    };
    const moreText = async () => {
      setBusy(true);
      try {
        const value = await read({ kind: "event", seq: item.seq, offset: item.text.length + pages.reduce((n, p) => n + p.text.length, 0) }, life.current.signal);
        if (!life.current.signal.aborted) setPages((p) => [...p, value]);
      } catch (e) {
        if (!life.current.signal.aborted) setError(e);
      } finally {
        if (!life.current.signal.aborted) setBusy(false);
      }
    };
    const refs = [.../* @__PURE__ */ new Set([...item.compaction?.shadowedSeqs || [], ...item.sourceEventSeqs || []])];
    return h("article", { className: "dcl-source-record" }, showProvenance && item.provenance ? h("div", { className: "dcl-record-origin" }, h("strong", null, localized(item.provenance, t)), h(Provenance, { value: item.provenance, t })) : null, h("div", { className: "dcl-source-meta" }, `${t("seq")} #${item.seq} \xB7 ${item.type}`, item.time ? h("time", null, new Date(item.time).toLocaleTimeString(t("formatLocale"))) : null), item.parentSession ? h("p", { className: "dcl-small" }, t("inheritedSession", { session: item.parentSession })) : null, item.prunedBySeq != null ? h("p", { className: "dcl-small" }, t("prunedResult", { seq: item.prunedBySeq })) : null, item.originRounds?.length ? h("div", { className: "dcl-small" }, `${t("history")} ${item.originRounds.join(", ")}`) : null, item.error ? h("p", { role: "alert" }, errorText(item.error, t)) : null, item.noteLabel ? h("p", { className: "dcl-small" }, localized(item, t, "note")) : null, h("pre", { className: "dcl-body" }, item.text, ...pages.map((p, i) => h("span", { key: i }, p.text))), pages.at(-1)?.moreText ?? item.moreText ? h("button", { className: "dcl-link", onClick: moreText, disabled: busy }, t("textMore")) : null, item.attachmentRefs?.length ? h("details", null, h("summary", null, t("attachments")), item.attachmentRefs.some((r) => r.truncated) ? h("p", { className: "dcl-small" }, t("referenceTruncated")) : null, h("pre", { className: "dcl-body" }, JSON.stringify(item.attachmentRefs, null, 2))) : null, item.source ? h("details", null, h("summary", null, t("origin")), h("pre", { className: "dcl-body" }, JSON.stringify(item.source, null, 2))) : null, item.toolCall ? h("details", null, h("summary", null, t("toolCall", { name: item.toolCall.name })), h("pre", { className: "dcl-body" }, item.toolCall.arguments)) : null, item.summarySeq != null ? h("button", { className: "dcl-link", onClick: () => load(item.summarySeq), disabled: busy }, t("summary")) : null, item.compaction ? h("div", { className: "dcl-small" }, `${item.compaction.provider} / ${item.compaction.model} \xB7 ${item.compaction.compactionId}`) : null, item.auxiliaryInput ? h("details", null, h("summary", null, t("summaryInput")), h("p", { className: "dcl-small" }, localized(item.auxiliaryInput, t, "note")), h("p", { className: "dcl-small" }, t("summaryRefs", { sources: item.auxiliaryInput.sourceSeqs.join(", "), systems: item.auxiliaryInput.systemSeqs.join(", ") }))) : null, refs.length ? h("details", null, h("summary", null, `${t("raw")} \xB7 ${refs.length}`), h("div", { className: "dcl-ref-list" }, ...refs.map((seq) => h("button", { key: seq, className: "dcl-link", disabled: busy || depth >= 12, onClick: () => load(seq) }, `#${seq}`)))) : null, error ? h("p", { role: "alert" }, errorText(error, t)) : null, children?.map((child) => h(SourceEvent, { key: child.seq, item: child, read, t, depth: depth + 1 })));
  }
  function Provenance({ value, t }) {
    if (!value) return null;
    const labels = [localized(value, t, "method"), ...value.identifiers || []].filter(Boolean), files = value.files?.length ? value.files : value.file ? [value.file] : [];
    const extra = files.length || value.contributors?.length || value.module || value.api || value.loader || value.evidence === "runtime" || value.evidence === "runtime-registration" || value.evidence === "verified-session-mapping" || value.evidence === "producer-declared";
    return h("div", { className: "dcl-provenance" }, h("p", { className: "dcl-small" }, [...new Set(labels)].join(" \xB7 ")), extra ? h("details", null, h("summary", null, t("sourceInfo")), value.module ? h("p", { className: "dcl-small" }, t("module", { name: value.module }) + (value.version ? ` \xB7 ${value.version}` : "")) : null, value.contributors?.length ? h("ul", { className: "dcl-files" }, ...value.contributors.map((c, i) => h("li", { key: i }, h("strong", null, localized(c, t)), h("div", null, `${c.name} \xB7 ${c.evidence === "registry-snapshot" ? t("registryInventory") : c.api}`)))) : null, value.loader ? h("p", { className: "dcl-small" }, t("loader", { name: value.loader })) : null, value.api ? h("p", { className: "dcl-small" }, t("admissionApi", { name: value.api })) : null, files.length ? h("ul", { className: "dcl-files" }, ...files.map((path) => h("li", { key: path }, path))) : null, ["runtime", "runtime-registration"].includes(value.evidence) ? h("p", { className: "dcl-small" }, value.evidence === "runtime" ? t("evidenceRuntime") : t("evidenceRegistration")) : value.evidence === "verified-session-mapping" ? h("p", { className: "dcl-small" }, t("evidenceMapping")) : value.evidence === "producer-declared" ? h("p", { className: "dcl-small" }, t("evidenceDeclared")) : null) : null);
  }
  function SegmentDetail({ round, segment, read, t, onClose }) {
    const [data, setData] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const controller = useRef(null), shell = useRef(null), body = useRef(null), cache = useRef(/* @__PURE__ */ new Map());
    useLayoutEffect(() => {
      const el = shell.current, content = body.current;
      const resize = () => {
        el.style.height = `${content.getBoundingClientRect().height}px`;
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(content);
      return () => observer.disconnect();
    }, []);
    useEffect(() => {
      const c = new AbortController();
      controller.current = c;
      setError("");
      const key = `${round.cutSeq}:${segment.id}`, cached = cache.current.get(key);
      if (cached) {
        setData(cached);
        setBusy(false);
        return () => c.abort();
      }
      setBusy(true);
      read({ kind: "detail", roundId: round.id, segmentId: segment.id, view: round.isCurrent ? "current" : "round" }, c.signal).then((value) => {
        if (c.signal.aborted) return;
        cache.current.set(key, value);
        while (cache.current.size > 8) cache.current.delete(cache.current.keys().next().value);
        setData(value);
        setBusy(false);
      }, (e) => {
        if (!c.signal.aborted) {
          setError(e);
          setBusy(false);
        }
      });
      return () => c.abort();
    }, [round.id, round.cutSeq, segment.id, read]);
    const more = async () => {
      const c = controller.current;
      setBusy(true);
      try {
        const next = await read({ kind: "detail", roundId: round.id, segmentId: segment.id, view: round.isCurrent ? "current" : "round", offset: (data.offset || 0) + data.items.length }, c.signal);
        if (c.signal.aborted) return;
        setData((d) => {
          const value = { ...next, items: [...d.items, ...next.items] };
          cache.current.set(`${round.cutSeq}:${segment.id}`, value);
          return value;
        });
      } catch (e) {
        if (!c.signal.aborted) setError(e);
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    };
    const display = data?.segment || segment;
    return h("div", { className: "dcl-detail-shell", ref: shell }, h("section", { className: "dcl-detail", ref: body, "aria-busy": busy, style: { "--source": color(display) } }, h("header", null, h("strong", null, localized(display, t)), h("button", { className: "dcl-icon", onClick: onClose, "aria-label": t("close") }, "\xD7")), h(Provenance, { value: display.provenance, t }), h("p", { className: "dcl-small" }, `\u2248 ${fmt(display.tokens, t)} tokens`), busy ? h("p", { className: "dcl-loading", role: "status" }, data?.segment.id !== segment.id ? t("switching", { name: localized(segment, t) }) : t("loading")) : null, error ? h("p", { role: "alert" }, errorText(error, t)) : null, data?.items.map((item) => h(SourceEvent, { key: item.seq, item, read, t, showProvenance: data.items.length > 1 || ["history", "work", "summary"].includes(display.type) })), data?.more ? h("button", { className: "dcl-link", onClick: more, disabled: busy }, t("more")) : null));
  }
  function RequestDetail({ request, read, t }) {
    const [value, setValue] = useState(null), [error, setError] = useState(""), [source, setSource] = useState(null);
    const inputRead = (params, signal) => read({ ...params, atSeq: request.settlementSeq - 1 }, signal);
    return h("details", { className: "dcl-request", onToggle: (e) => {
      if (e.currentTarget.open && !value) read({ kind: "request", requestId: request.id }).then(setValue, (e2) => setError(e2));
    } }, h("summary", null, `${t("step", { step: request.step })} \xB7 ${t({ response: "requestResponse", attempt: "requestAttempt", interrupted: "requestInterrupted" }[request.status] || request.status)} \xB7 \u2248 ${short(request.inputTotal)}`), h("p", { className: "dcl-small" }, t("logicalInputNote")), error ? h("p", null, errorText(error, t)) : null, value ? h("div", null, ...value.inputSegments.map((s) => h("details", { key: s.id }, h("summary", null, `${localized(s, t)} \xB7 \u2248 ${short(s.tokens)}`), h(Provenance, { value: s.provenance, t }), ...[...s.refs, ...s.headerSeq == null ? [] : [{ seq: s.headerSeq }]].map((ref) => h("button", { key: ref.seq, className: "dcl-link", onClick: () => inputRead({ kind: "event", seq: ref.seq }).then(setSource, (e) => setError(e)) }, `#${ref.seq} `)))), h("details", null, h("summary", null, t("requestUsage")), h("pre", { className: "dcl-body" }, JSON.stringify({ ...value, inputSegments: void 0 }, null, 2)))) : null, source ? h(SourceEvent, { key: source.seq, item: source, read: inputRead, t }) : null);
  }
  function Round({ round, read, t, onTip, tip, tipId }) {
    const [expanded, setExpanded] = useState(false), [selected, setSelected] = useState(null);
    const refs = useRef(/* @__PURE__ */ new Map());
    const close = () => {
      const id = selected;
      setSelected(null);
      refs.current.get(id)?.focus({ preventScroll: true });
      onTip(null);
    };
    const [removed, setRemoved] = useState(null);
    const chosen = round.segments.find((s) => s.id === selected);
    const status = round.status === "interrupted" ? t("interrupted") : round.status === "running" ? t("running") : round.status === "completed" ? "" : { error: "statusError", blocked: "statusBlocked", "max-tokens": "statusMaxTokens", forked: "statusForked", cancelled: "statusCancelled", recovered: "statusRecovered", unknown: "statusUnknown" }[round.status] ? t({ error: "statusError", blocked: "statusBlocked", "max-tokens": "statusMaxTokens", forked: "statusForked", cancelled: "statusCancelled", recovered: "statusRecovered", unknown: "statusUnknown" }[round.status]) : round.status;
    return h("section", { className: "dcl-round", "data-round": round.id, onKeyDown: (e) => {
      if (e.key === "Escape") {
        if (tip) {
          onTip(null);
          e.stopPropagation();
          return;
        }
        if (selected) close();
        else {
          setExpanded(false);
          e.currentTarget.querySelector(".dcl-round-toggle")?.focus({ preventScroll: true });
        }
        onTip(null);
        e.stopPropagation();
      }
    } }, h("div", { className: "dcl-heading" }, h("span", { className: "dcl-number" }, round.isCurrent ? "\u21BA" : String(round.id).padStart(2, "0")), h("button", { className: "dcl-round-toggle", "aria-label": t(expanded ? "collapseRound" : "expandRound", { round: round.id }), "aria-expanded": expanded, onClick: () => setExpanded((v) => !v) }, h("span", { className: "dcl-round-title" }, localized(round, t)), status ? h("span", { className: "dcl-status", "data-status": round.status }, round.status === "interrupted" ? "\u25A0 " : null, status) : null, h("span", { className: "dcl-chevron", style: { transform: expanded ? "rotate(180deg)" : "none" } }, "\u2304"))), h("div", { className: "dcl-metrics" }, h("span", { className: "dcl-size", title: `\u2248 ${fmt(round.total, t)} tokens` }, h("strong", null, short(round.total)), h("span", { className: "dcl-capacity" }, round.capacity ? ` / ${short(round.capacity)}` : ` / ${t("unknown")}`), h("span", { className: "dcl-caption" }, t("window"))), h("span", { className: "dcl-added", title: `${fmt(round.added, t)} tokens` }, `+${short(round.added)}`, h("span", { className: "dcl-caption" }, t("round")))), h("div", { className: "dcl-ribbon", role: "group", "aria-label": t("roundComposition", { round: round.id }) }, ...round.segments.map((s) => h("button", { key: s.id, ref: (el) => {
      if (el) refs.current.set(s.id, el);
      else refs.current.delete(s.id);
    }, type: "button", className: "dcl-segment", "data-source": s.sourceKey, "aria-label": t("inspectSource", { name: localized(s, t) }), "aria-expanded": selected === s.id, "aria-describedby": tip?.anchor === refs.current.get(s.id) ? tipId : void 0, style: { flexGrow: s.tokens, "--source": color(s) }, onPointerEnter: (e) => onTip({ segment: s, anchor: e.currentTarget }), onPointerLeave: () => onTip(null), onFocus: (e) => onTip({ segment: s, anchor: e.currentTarget }), onBlur: () => onTip(null), onClick: () => {
      setSelected((v) => v === s.id ? null : s.id);
      onTip(null);
    } }))), chosen ? h(SegmentDetail, { round, segment: chosen, read, t, onClose: close }) : null, expanded ? h("div", { className: "dcl-audit" }, h("div", { className: "dcl-audit-metrics" }, h("span", null, `${t("boundary")} \xB7 #${round.cutSeq}`), h("span", null, t("retainedCount", { count: fmt(round.total, t) })), h("span", null, t("newCount", { count: fmt(round.added, t) })), h("span", null, t("netChange", { count: `${round.delta >= 0 ? "+" : ""}${fmt(round.delta, t)}` }))), round.reason && round.status !== "completed" ? h("pre", { className: "dcl-body" }, JSON.stringify(round.reason, null, 2)) : null, h("p", { className: "dcl-small" }, t("newBasis")), ...round.segments.map((s) => h("button", { key: s.id, className: "dcl-event", style: { "--source": color(s) }, onClick: () => {
      setSelected(s.id);
      onTip(null);
    } }, h("strong", null, localized(s, t)), h("span", null, `\u2248 ${short(s.tokens)}`), h("small", { className: "dcl-source-hint" }, [localized(s.provenance, t, "method"), ...s.provenance?.identifiers || []].filter(Boolean).join(" \xB7 ")), h("small", null, s.refs.length ? t("sourceLog", { refs: s.refs.map((n) => `#${n.seq}`).join(", ") }) : t("toolDefinitions")))), round.changes?.length ? h("details", null, h("summary", null, t("sourceChanges")), ...round.changes.map((c) => h("details", { key: c.source }, h("summary", null, localized(c, t) || c.source), h(Provenance, { value: c.provenance, t }), ...Object.entries({ added: "changeAdded", removed: "changeRemoved", retained: "changeRetained", transient: "changeTransient" }).map(([key, label]) => c[key].length ? h("div", { key, className: "dcl-small" }, t(label), " ", ...c[key].map((seq) => h("button", { key: seq, className: "dcl-link", onClick: () => read({ kind: "event", seq }).then(setRemoved, (e) => setRemoved({ seq, text: "", error: e, type: "unavailable" })) }, `#${seq} `))) : null))), removed ? h(SourceEvent, { key: removed.seq, item: removed, read, t }) : null) : null, h("details", null, h("summary", null, `${round.requests.length} \xB7 ${t("request")}`), ...round.requests.map((r) => h(RequestDetail, { key: r.id, request: r, read, t })))) : null);
  }
  function Panel({ sessionId, useProjection, t }) {
    const available = React.useSyncExternalStore(subscribeAvailability, availabilitySnapshot, availabilitySnapshot);
    const revision = useProjection("contextLite"), [stored, setData] = useState(null), [failure, setFailure] = useState(null), [retry, setRetry] = useState(0), [storedTip, setTip] = useState(null), [info, setInfo] = useState(false);
    const life = useRef(null), tipId = useId();
    const data = stored?.sessionId === sessionId && available ? stored : null;
    const error = failure?.sessionId === sessionId && available ? failure.error : null;
    const setError = (error2) => setFailure({ sessionId, error: error2 });
    const tip = storedTip?.sessionId === sessionId ? storedTip : null;
    const read = useCallback((params, signal) => query(sessionId, params, signal || life.current?.signal), [sessionId]);
    useEffect(() => {
      const c = new AbortController();
      life.current = c;
      setData(null);
      setError("");
      setTip(null);
      return () => c.abort();
    }, [sessionId]);
    useEffect(() => {
      const c = new AbortController();
      let stale = false;
      const timer = setTimeout(() => read({ kind: "overview" }, c.signal).then((value) => {
        if (!stale) {
          setData((old) => old && old.sessionId === value.sessionId && old.rounds[0]?.id < value.rounds[0]?.id ? { ...value, rounds: [...old.rounds.filter((r) => r.id < value.rounds[0].id), ...value.rounds], hiddenRounds: old.hiddenRounds } : value);
          setError("");
        }
      }, (e) => {
        if (!c.signal.aborted && !stale) setError(e);
      }), 80);
      return () => {
        stale = true;
        clearTimeout(timer);
        c.abort();
      };
    }, [sessionId, revision, retry, read]);
    useEffect(() => {
      if (!tip) return;
      const close = () => setTip(null);
      window.addEventListener("resize", close);
      return () => window.removeEventListener("resize", close);
    }, [tip]);
    const rect = tip?.anchor.getBoundingClientRect();
    return h("div", { className: "dcl-root", "data-session-id": sessionId, onScroll: () => setTip(null), onKeyDown: (e) => {
      if (e.key === "Escape" && tip) {
        setTip(null);
        e.stopPropagation();
      }
    } }, h("style", null, STYLE), h("div", { className: "dcl-top" }, h("span", null, h(Icon), t("tab")), h("button", { className: "dcl-icon", "aria-label": t("info"), "aria-expanded": info, onClick: () => setInfo((v) => !v) }, "\u24D8")), info ? h("div", { className: "dcl-info" }, h("p", null, t("estimate")), ...(data?.limitLabels || data?.limits?.map((_, i) => ({ key: ["limitEstimate", "limitRequest", "limitSummary"][i] })) || []).map((spec, i) => h("p", { key: i }, t(spec.key, spec.params))), h("p", null, t("sessionLabel", { session: sessionId })), data?.collection ? h("p", null, [t("collectionStatus", { state: t(data.collection.enabled ? "enabled" : "disabled"), count: fmt(data.collection.observedCalls, t), storage: t(data.collection.persistence === "host-storage" ? "hostStorage" : "memoryStorage") }), data.collection.failures ? t("collectionPartial") : null, data.collection.storageError ? t("storageError") : null].filter(Boolean).join(" \xB7 ")) : null, data?.collection ? h("p", null, t("coverageNote")) : null, data?.build ? h("p", null, `Context Lite ${data.version} \xB7 ${data.build}`) : null) : null, error ? h("div", { className: "dcl-empty", role: "alert" }, h("p", null, t("error")), h("p", { className: "dcl-small" }, errorText(error, t)), h("button", { className: "dcl-link", onClick: () => setRetry((x) => x + 1) }, t("retry"))) : null, !data && !error ? h("div", { className: "dcl-empty", role: "status" }, h("p", null, t(revision === void 0 || !available ? "unavailable" : "loading")), revision === void 0 || !available ? h("button", { className: "dcl-link", onClick: () => setRetry((x) => x + 1) }, t("retry")) : null) : null, data?.hiddenRounds ? h("button", { className: "dcl-link", onClick: () => read({ kind: "overview", beforeRound: data.rounds[0].id }).then((page) => setData((old) => ({ ...old, rounds: [...page.rounds, ...old.rounds], hiddenRounds: page.hiddenRounds })), (e) => setError(e)) }, t("earlierRounds", { count: data.hiddenRounds })) : null, data?.rounds.length === 0 ? h("p", { className: "dcl-empty" }, t("empty")) : null, data ? h("div", { className: "dcl-timeline" }, ...[...data.rounds, ...data.current ? [data.current] : []].map((r) => h(Round, { key: `${sessionId}:${r.isCurrent ? "current" : r.id}`, round: r, read, t, onTip: (value) => setTip(value ? { ...value, sessionId } : null), tip, tipId }))) : null, tip && rect ? h("div", { id: tipId, role: "tooltip", className: "dcl-tooltip", style: { left: Math.max(10, Math.min(window.innerWidth - 250, rect.left + rect.width / 2 - 110)), top: rect.top > 130 ? rect.top - 100 : rect.bottom + 10 } }, h("strong", null, h("i", { style: { background: color(tip.segment) } }), localized(tip.segment, t)), h("span", null, [localized(tip.segment.provenance, t, "method"), ...tip.segment.provenance?.identifiers || []].filter(Boolean).join(" \xB7 ")), h("span", { className: "dcl-tip-action" }, tip.segment.refs.length > 1 ? t("continuousItems", { count: tip.segment.refs.length }) : t("inspectContent"))) : null);
  }
  function apply(ctx) {
    const t = ctx.locale.bind(NS);
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), "context-lite: copy");
    ctx.effect(() => ctx.sidebarRightTabs.register({ id: NS, kind: NS, title: () => t("tab"), guide: [{ id: NS, order: 15, title: () => t("tab"), description: () => t("guide"), icon: Icon }] }), "context-lite: tab");
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: NS, locale: NS }, Panel)), "context-lite: body");
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: NS, locale: NS }, ({ t: t2 }) => t2("tab"))), "context-lite: live tab title");
    ctx.effect(() => ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({ name: "conversation.session.header.utilities", id: "context-lite-open", locale: NS, order: 35, inject: () => ({ open: () => ctx.sidebarRight.openTab(NS) }) }, ({ open, t: t2, useProjection }) => {
      const revision = useProjection("contextLite");
      const available = React.useSyncExternalStore(subscribeAvailability, availabilitySnapshot, availabilitySnapshot);
      if (!available) return null;
      return h("button", { type: "button", className: "dcl-open", "aria-label": t2("tab"), title: t2("guide"), onClick: open }, h("style", null, ".dcl-open{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:14px;background:transparent;color:inherit;cursor:pointer}.dcl-open:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}.dcl-open:focus-visible{outline:2px solid #4176e6}"), h(Icon));
    })), "context-lite: open");
  }
  return __toCommonJS(client_exports);
})();

return __ContextLiteClient;}});
