import{aU as T}from"./iframe-CCXMVT-v.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DKPNUeGv.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DaCbcG06.js";import"./Select-ef7c0426.esm-DtGyvNQX.js";import"./chevron-down-RJ_giY1X.js";import"./check-CnwjW71B.js";import"./project-tag-DWTVw3nN.js";import"./project-modal-Bg8WYsEs.js";import"./export-menu-DeDbAmYM.js";import"./client-C5ni5EVt.js";import"./markdown-preview-BjGV3TeM.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BfOsHWFX.js";import"./copy-D6noqLqq.js";import"./file-code-corner-Bc7SkSQB.js";import"./loader-circle-BWtE5DIH.js";import"./api--1Yy4raK.js";import"./folder-open-bzXyCDck.js";import"./folder-CSAWqMlY.js";import"./tag-color-picker-B6EYJte3.js";import"./sparkles-CLwv_cuS.js";import"./brain-B7UIMFHw.js";import"./chevron-right-BqcdkrJx.js";import"./markdown-editor-DNq3p4Xq.js";import"./pencil-CJCmbY2j.js";import"./trash-2-DCeW2ZIF.js";import"./confirm-dialog-Cs_KzByr.js";import"./index-BnHdAz3K.js";import"./triangle-alert-D_obCj_E.js";import"./templates-B6M1OYb3.js";import"./plus-QKZoN9mL.js";import"./task-row-DonNMSQQ.js";import"./i18n-labels-DklRfvyR.js";import"./selectable-icon-BZNnUHbh.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C9_aFjBs.js";import"./arrow-left-CNPaFyOR.js";import"./spinner-DDZ0B_VS.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CGHq3IS5.js";import"./use-api-data-C2BfU0Uu.js";import"./useQuery-Br4Riq_f.js";import"./presentation-JqpQqbQf.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
