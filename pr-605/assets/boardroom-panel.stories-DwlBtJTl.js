import{a$ as T}from"./iframe-C-gkDFgQ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Ducdazot.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DDe-Z3Ss.js";import"./Select-ef7c0426.esm-CLkRzUuj.js";import"./chevron-down-5G1usU0g.js";import"./check-DX4g8Z9e.js";import"./project-tag-BtOKRzmd.js";import"./project-modal-Dm5uiO99.js";import"./export-menu-Cv3T2Snh.js";import"./client-7jcxnK6I.js";import"./markdown-preview-CU9Fur4c.js";import"./index.dom-D_wTd2ti.js";import"./copy-MmwW1thq.js";import"./file-code-corner-B3rsW5Mw.js";import"./file-text-B6vis_Nc.js";import"./loader-circle-BlKNw-Xq.js";import"./api-C-1Iqnef.js";import"./folder-open-DQ_hJA-R.js";import"./folder-mqtI5Meo.js";import"./tag-color-picker-Cq-4Y0XD.js";import"./sparkles-CXK3aYUJ.js";import"./brain-DZbNbhlV.js";import"./chevron-right-Du0_pD_h.js";import"./markdown-editor-DKvQ8F-y.js";import"./pencil-CjQSpOH2.js";import"./trash-2-son2HEdS.js";import"./confirm-dialog-DwL22qxK.js";import"./templates-cLoTDIMW.js";import"./project-template-labels-DaCtgRjp.js";import"./plus-D3S0lqhN.js";import"./task-row-BloIELV0.js";import"./blocked-badge-Dzrksw0S.js";import"./selectable-icon-0lkI3B08.js";import"./hover-expand-button--VN45Qhn.js";import"./index-BLFwPiod.js";import"./data-refresh-CmU9bVHp.js";import"./rotate-ccw-Daf85h-f.js";import"./play-C9uEwDxF.js";import"./square-terminal-GgLVdHSR.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-f5WwPOoP.js";import"./spinner-CFKUagiT.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DjSB8le-.js";import"./useQuery-BLzfYHny.js";import"./presentation-BHrV60l4.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
