import{aX as T}from"./iframe-zwt-8yYf.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D5QK577l.js";import"./preload-helper-Dp1pzeXC.js";import"./index-PYbvJYhy.js";import"./Select-ef7c0426.esm-ATTBtIHg.js";import"./chevron-down-o9u8cArH.js";import"./check-Ck2R87jE.js";import"./project-tag-BqvUoxpe.js";import"./project-modal-MOaVrubL.js";import"./export-menu-v8ik6cbu.js";import"./client-BYqPhUF1.js";import"./markdown-preview-PWYUObnY.js";import"./index.dom-D_wTd2ti.js";import"./file-text-zdxrUGbD.js";import"./copy-D9UbkFqM.js";import"./file-code-corner-Dds5ySC7.js";import"./loader-circle-BSO_r_km.js";import"./api-Cj0Uu1Vy.js";import"./folder-open-BtAkciwW.js";import"./folder-DHfMV0pj.js";import"./tag-color-picker-CkQUjnWE.js";import"./sparkles-CqZnrBKT.js";import"./brain-Bob5H6d4.js";import"./chevron-right-CcwOadAE.js";import"./markdown-editor-eNYm9Bam.js";import"./pencil-DM6F6sIl.js";import"./trash-2-BFuKNlz9.js";import"./confirm-dialog-BkEOzlnU.js";import"./index-B0MyLQ8X.js";import"./triangle-alert-DmFXG_Eh.js";import"./templates-B6M1OYb3.js";import"./plus-By5OTE90.js";import"./task-row-CcQKQdT_.js";import"./blocked-badge-CJbu1xJ5.js";import"./selectable-icon-BTPnMily.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DQnTufvB.js";import"./arrow-left-C5ZINheA.js";import"./spinner-Btgkk8dG.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CuEOzURc.js";import"./use-api-data-QRPO_TdY.js";import"./useQuery-CwkD01bL.js";import"./presentation-FwsGk807.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(i=o.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Bt as __namedExportsOrder,wt as default};
