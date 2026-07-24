import{aU as T}from"./iframe-Q5gA5LgF.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CEW2c-Bj.js";import"./preload-helper-Dp1pzeXC.js";import"./index-UlzLH2B7.js";import"./Select-ef7c0426.esm-BYHOCdpE.js";import"./chevron-down-D7CAMhlG.js";import"./check-DBlKvffa.js";import"./project-tag-COYu4rD8.js";import"./project-modal-CGb8sAAi.js";import"./export-menu-BREPPwjv.js";import"./client-xeAKTAhJ.js";import"./markdown-preview-EG3VYYKB.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DFtxnn5F.js";import"./copy-CTuMVFwC.js";import"./file-code-corner-IXwDB5PW.js";import"./loader-circle-DmOZrD0g.js";import"./api-Der6T2Mz.js";import"./folder-open-BdLnAirm.js";import"./folder-DGn3vRaL.js";import"./tag-color-picker-Cy6FA4l7.js";import"./sparkles-DLOOHqld.js";import"./brain-ByBRO25K.js";import"./chevron-right-DqSp8sAQ.js";import"./markdown-editor-Qmnx7qWm.js";import"./pencil-C1SzQ3E8.js";import"./trash-2-BX8I-2hi.js";import"./confirm-dialog-WsNr8a1P.js";import"./index-CCtfIiMl.js";import"./triangle-alert--Mui-f0z.js";import"./templates-B6M1OYb3.js";import"./plus-9sBXorrl.js";import"./task-row-DDT9fqy9.js";import"./i18n-labels-4AWYgzg0.js";import"./selectable-icon-BQt0HTBZ.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Cklo80N_.js";import"./arrow-left-mUH1LMm_.js";import"./spinner-D39RVV_1.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CWvC2gjp.js";import"./use-api-data-0Lue1Nzf.js";import"./useQuery-CSigHBub.js";import"./presentation-C-k6LUQF.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
