import{a_ as T}from"./iframe-2w8WUB7i.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-B6aoDWZD.js";import"./preload-helper-Dp1pzeXC.js";import"./index-g8mfm3rF.js";import"./Select-ef7c0426.esm-31hPiniX.js";import"./chevron-down-CMciDkeD.js";import"./check-DphwQmXI.js";import"./project-tag-1vPeUe76.js";import"./project-modal-BUZs2dnt.js";import"./export-menu-UcxcXz5w.js";import"./client-CIgzJ8Lj.js";import"./markdown-preview-Uy3HQOb-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C4T0dhAd.js";import"./copy-BpkMMccI.js";import"./file-code-corner-DhTSFV62.js";import"./loader-circle-CWmU52n4.js";import"./api-DEhZjO2T.js";import"./folder-open-DyT--brf.js";import"./folder-BXS0NgVe.js";import"./tag-color-picker-BPjNcq2q.js";import"./sparkles-DfwE8PX0.js";import"./brain-BwQZPT0d.js";import"./chevron-right-BIILyTFj.js";import"./markdown-editor-CvX72EXK.js";import"./pencil-DuBhdr7n.js";import"./trash-2-BjFm56Zf.js";import"./confirm-dialog-DrxxWzsz.js";import"./index-Duqm8mUL.js";import"./templates-BVPqduWD.js";import"./plus-ByxAXtii.js";import"./task-row-v1ALEKN7.js";import"./blocked-badge-Dp9ic8Xi.js";import"./selectable-icon-BqIFI_mS.js";import"./hover-expand-button-DCxnBoZY.js";import"./index-B0brNB0j.js";import"./data-refresh-C710zyF5.js";import"./rotate-ccw-DNFqCMC8.js";import"./play-Dgy13qIe.js";import"./square-terminal-Bm8SZSB7.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-D1WKTH9x.js";import"./spinner-D_qNvHNZ.js";import"./task-route-D70_7rUP.js";import"./use-api-data-Cc4Nahq_.js";import"./useQuery-DcH4dAvS.js";import"./presentation-CQjALrMb.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Dt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,Dt as __namedExportsOrder,xt as default};
