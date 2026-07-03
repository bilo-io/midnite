import{n as S}from"./iframe-CyuGqAe9.js";import{P as x}from"./pr-diff-viewer-X6Xl4FSY.js";import"./preload-helper-Dp1pzeXC.js";import"./use-local-storage-Crnnz64c.js";import"./index.dom-D_wTd2ti.js";import"./chevron-right-DITEDcg9.js";import"./file-code-corner-uXRIBg1X.js";import"./file-text-BWd2yTs2.js";var a,r,s,o,l,c,p,u,f,m,w,v,h,_,k;const{expect:y,userEvent:g,within:b}=__STORYBOOK_MODULE_TEST__,L={prUrl:"https://github.com/midnite/midnite/pull/271",additions:24,deletions:7,truncated:!1,hiddenFileCount:0,hiddenFiles:[],fetchedAt:"2026-07-02T10:00:00Z",files:[{path:"packages/web/components/pr-review/pr-diff-viewer.tsx",status:"added",additions:14,deletions:0,binary:!1,hunks:[{header:"@@ -0,0 +1,14 @@",oldStart:0,oldLines:0,newStart:1,newLines:14,lines:[{kind:"add",content:"import { useMemo, useState } from 'react';",newLine:1},{kind:"add",content:"import type { ViewType } from 'react-diff-view';",newLine:2},{kind:"add",content:"import type { PrDiff } from '@midnite/shared';",newLine:3},{kind:"add",content:"",newLine:4},{kind:"add",content:"export function PrDiffViewer({ diff }: { diff: PrDiff }) {",newLine:5},{kind:"add",content:"  const [viewType, setViewType] = useState<ViewType>('unified');",newLine:6},{kind:"add",content:"  const files = useMemo(() => diff.files, [diff.files]);",newLine:7},{kind:"add",content:"  return (",newLine:8},{kind:"add",content:'    <div className="viewer">',newLine:9},{kind:"add",content:"      {/* toolbar + file tree + hunks */}",newLine:10},{kind:"add",content:"      {files.length} files changed",newLine:11},{kind:"add",content:"    </div>",newLine:12},{kind:"add",content:"  );",newLine:13},{kind:"add",content:"}",newLine:14}]}]},{path:"packages/web/components/task-detail.tsx",status:"modified",additions:8,deletions:3,binary:!1,hunks:[{header:"@@ -134,7 +134,12 @@ export function TaskDetail() {",oldStart:134,oldLines:7,newStart:134,newLines:12,lines:[{kind:"context",content:"  const [prStatus, setPrStatus] = useState(task.prStatus);",oldLine:134,newLine:134},{kind:"add",content:"  const [showDiff, setShowDiff] = useState(false);",newLine:135},{kind:"context",content:"",oldLine:135,newLine:136},{kind:"del",content:"  return <PrStatusChip status={prStatus} />;",oldLine:136},{kind:"add",content:"  return (",newLine:137},{kind:"add",content:"    <button onClick={() => setShowDiff(true)}>View diff</button>",newLine:138},{kind:"add",content:"  );",newLine:139}]}]},{path:"packages/web/components/pr-review/diff-theme.css",status:"added",additions:2,deletions:0,binary:!1,hunks:[{header:"@@ -0,0 +1,2 @@",oldStart:0,oldLines:0,newStart:1,newLines:2,lines:[{kind:"add",content:".pr-diff-viewer {",newLine:1},{kind:"add",content:"  --diff-text-color: hsl(var(--foreground));",newLine:2}]}]},{path:"docs/screenshots/logo.png",status:"added",additions:0,deletions:0,binary:!0,hunks:[]}]},R={title:"PR Review/PrDiffViewer",component:x,parameters:{layout:"fullscreen"},decorators:[d=>S.jsx("div",{className:"h-[600px] overflow-hidden rounded-lg border border-border",children:S.jsx(d,{})})]},t={args:{diff:L}},n={args:{diff:L},play:async({canvasElement:d})=>{const e=b(d);await g.click(e.getByLabelText("Split view")),await g.click(e.getByRole("button",{name:/expand all/i})),await y(e.getByLabelText("Split view").getAttribute("aria-pressed")).toBe("true")}},i={args:{diff:{...L,truncated:!0,hiddenFileCount:12,hiddenFiles:Array.from({length:12},(d,e)=>`big/file-${e}.ts`)}}};t.parameters={...t.parameters,docs:{...(a=t.parameters)===null||a===void 0?void 0:a.docs,source:{originalSource:`{
  args: {
    diff: DIFF
  }
}`,...(s=t.parameters)===null||s===void 0||(r=s.docs)===null||r===void 0?void 0:r.source},description:{story:"The default review surface: file tree + the first file expanded (unified).",...(l=t.parameters)===null||l===void 0||(o=l.docs)===null||o===void 0?void 0:o.description}}};n.parameters={...n.parameters,docs:{...(c=n.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
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
}`,...(u=n.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"Split view with every file expanded — driven through the toolbar controls.",...(m=n.parameters)===null||m===void 0||(f=m.docs)===null||f===void 0?void 0:f.description}}};i.parameters={...i.parameters,docs:{...(w=i.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
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
}`,...(h=i.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.source},description:{story:"A truncated diff surfaces the hidden-file count rather than cutting silently.",...(k=i.parameters)===null||k===void 0||(_=k.docs)===null||_===void 0?void 0:_.description}}};const C=["Default","SplitExpanded","Truncated"];export{t as Default,n as SplitExpanded,i as Truncated,C as __namedExportsOrder,R as default};
