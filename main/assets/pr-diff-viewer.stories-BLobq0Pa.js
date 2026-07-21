import{aX as d}from"./iframe-Chfe_yyu.js";import{P as F}from"./pr-diff-viewer-CDEM6H3q.js";import{C as R}from"./confirm-dialog-Ce5fatEw.js";import"./preload-helper-Dp1pzeXC.js";import"./use-local-storage-EiscRyeB.js";import"./api-Bw2TaCuL.js";import"./index.dom-D_wTd2ti.js";import"./chevron-right-CgTgQd19.js";import"./file-code-corner-Bmqg-70x.js";import"./file-text-DxW42wT2.js";import"./index-CCrl9ZdV.js";import"./Select-ef7c0426.esm-dke19RAq.js";import"./chevron-down-CD2txmuJ.js";import"./check-C-N8ojlB.js";import"./message-square-8THdEJoL.js";import"./git-merge-D7wXCwkm.js";import"./index-C8aWVn71.js";import"./triangle-alert-DHh26j0A.js";var s,c,l,p,u,f,m,v,w,h,_,k,g,y,S,L,x,b,T,D;const{expect:A,userEvent:E,within:P}=__STORYBOOK_MODULE_TEST__,o={prUrl:"https://github.com/midnite/midnite/pull/271",additions:24,deletions:7,truncated:!1,hiddenFileCount:0,hiddenFiles:[],fetchedAt:"2026-07-02T10:00:00Z",aiReview:{verdict:"changes-requested",summary:"The viewer looks solid, but the tokenize call should be memoised — it re-runs on every keystroke in the composer.",reviewedAt:"2026-07-02T09:55:00Z"},files:[{path:"packages/web/components/pr-review/pr-diff-viewer.tsx",status:"added",additions:14,deletions:0,binary:!1,hunks:[{header:"@@ -0,0 +1,14 @@",oldStart:0,oldLines:0,newStart:1,newLines:14,lines:[{kind:"add",content:"import { useMemo, useState } from 'react';",newLine:1},{kind:"add",content:"import type { ViewType } from 'react-diff-view';",newLine:2},{kind:"add",content:"import type { PrDiff } from '@midnite/shared';",newLine:3},{kind:"add",content:"",newLine:4},{kind:"add",content:"export function PrDiffViewer({ diff }: { diff: PrDiff }) {",newLine:5},{kind:"add",content:"  const [viewType, setViewType] = useState<ViewType>('unified');",newLine:6},{kind:"add",content:"  const files = useMemo(() => diff.files, [diff.files]);",newLine:7},{kind:"add",content:"  return (",newLine:8},{kind:"add",content:'    <div className="viewer">',newLine:9},{kind:"add",content:"      {/* toolbar + file tree + hunks */}",newLine:10},{kind:"add",content:"      {files.length} files changed",newLine:11},{kind:"add",content:"    </div>",newLine:12},{kind:"add",content:"  );",newLine:13},{kind:"add",content:"}",newLine:14}]}]},{path:"packages/web/components/task-detail.tsx",status:"modified",additions:8,deletions:3,binary:!1,hunks:[{header:"@@ -134,7 +134,12 @@ export function TaskDetail() {",oldStart:134,oldLines:7,newStart:134,newLines:12,lines:[{kind:"context",content:"  const [prStatus, setPrStatus] = useState(task.prStatus);",oldLine:134,newLine:134},{kind:"add",content:"  const [showDiff, setShowDiff] = useState(false);",newLine:135},{kind:"context",content:"",oldLine:135,newLine:136},{kind:"del",content:"  return <PrStatusChip status={prStatus} />;",oldLine:136},{kind:"add",content:"  return (",newLine:137},{kind:"add",content:"    <button onClick={() => setShowDiff(true)}>View diff</button>",newLine:138},{kind:"add",content:"  );",newLine:139}]}]},{path:"packages/web/components/pr-review/diff-theme.css",status:"added",additions:2,deletions:0,binary:!1,hunks:[{header:"@@ -0,0 +1,2 @@",oldStart:0,oldLines:0,newStart:1,newLines:2,lines:[{kind:"add",content:".pr-diff-viewer {",newLine:1},{kind:"add",content:"  --diff-text-color: hsl(var(--foreground));",newLine:2}]}]},{path:"docs/screenshots/logo.png",status:"added",additions:0,deletions:0,binary:!0,hunks:[]}]},H={title:"PR Review/PrDiffViewer",component:F,parameters:{layout:"fullscreen"},decorators:[e=>d.jsx("div",{className:"h-[600px] overflow-hidden rounded-lg border border-border",children:d.jsx(e,{})})]},n={args:{diff:o}},i={args:{diff:o},play:async({canvasElement:e})=>{const t=P(e);await E.click(t.getByLabelText("Split view")),await E.click(t.getByRole("button",{name:/expand all/i})),await A(t.getByLabelText("Split view").getAttribute("aria-pressed")).toBe("true")}},r={args:{diff:{...o,truncated:!0,hiddenFileCount:12,hiddenFiles:Array.from({length:12},(e,t)=>`big/file-${t}.ts`)}}},a={args:{diff:o,taskId:"demo-task"},decorators:[e=>d.jsx(R,{children:d.jsx(e,{})})],play:async({canvasElement:e})=>{const t=e.querySelector(".diff-gutter");t&&await E.click(t)}};n.parameters={...n.parameters,docs:{...(s=n.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    diff: DIFF
  }
}`,...(l=n.parameters)===null||l===void 0||(c=l.docs)===null||c===void 0?void 0:c.source},description:{story:"The default review surface: file tree + the first file expanded (unified).",...(u=n.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};i.parameters={...i.parameters,docs:{...(f=i.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  args: {
    diff: DIFF
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('Split view'));
    await userEvent.click(canvas.getByRole('button', {
      name: /expand all/i
    }));
    await expect(canvas.getByLabelText('Split view').getAttribute('aria-pressed')).toBe('true');
  }
}`,...(v=i.parameters)===null||v===void 0||(m=v.docs)===null||m===void 0?void 0:m.source},description:{story:"Split view with every file expanded — driven through the toolbar controls.",...(h=i.parameters)===null||h===void 0||(w=h.docs)===null||w===void 0?void 0:w.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  args: {
    diff: {
      ...DIFF,
      truncated: true,
      hiddenFileCount: 12,
      hiddenFiles: Array.from({
        length: 12
      }, (_, i) => \`big/file-\${i}.ts\`)
    }
  }
}`,...(g=r.parameters)===null||g===void 0||(k=g.docs)===null||k===void 0?void 0:k.source},description:{story:"A truncated diff surfaces the hidden-file count rather than cutting silently.",...(S=r.parameters)===null||S===void 0||(y=S.docs)===null||y===void 0?void 0:y.description}}};a.parameters={...a.parameters,docs:{...(L=a.parameters)===null||L===void 0?void 0:L.docs,source:{originalSource:`{
  args: {
    diff: DIFF,
    taskId: 'demo-task'
  },
  decorators: [Story => <ConfirmProvider>
        <Story />
      </ConfirmProvider>],
  play: async ({
    canvasElement
  }) => {
    const gutter = canvasElement.querySelector('.diff-gutter');
    if (gutter) await userEvent.click(gutter);
  }
}`,...(b=a.parameters)===null||b===void 0||(x=b.docs)===null||x===void 0?void 0:x.source},description:{story:"Review mode (Phase 52 Theme C): passing a `taskId` turns the viewer into a\nwrite-back surface — a review action bar (approve / request-changes / comment +\nmerge) and click-a-gutter inline comments. The play fn opens the inline composer.",...(D=a.parameters)===null||D===void 0||(T=D.docs)===null||T===void 0?void 0:T.description}}};const J=["Default","SplitExpanded","Truncated","WithReviewActions"];export{n as Default,i as SplitExpanded,r as Truncated,a as WithReviewActions,J as __namedExportsOrder,H as default};
