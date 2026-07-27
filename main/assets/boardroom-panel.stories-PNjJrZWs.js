import{a$ as T}from"./iframe-C6MBaEds.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DlHvamTk.js";import"./preload-helper-Dp1pzeXC.js";import"./index-2wHrJ3d2.js";import"./Select-ef7c0426.esm-uWcP410e.js";import"./chevron-down-CXVwBAJq.js";import"./check-Cu7fqz3t.js";import"./project-tag-BHSuj6GP.js";import"./project-modal-CirIJfKJ.js";import"./export-menu-BytF1zZK.js";import"./client-CPAcGLlt.js";import"./markdown-preview-CoFg2SgD.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DigEiw24.js";import"./copy-Dxcx0iga.js";import"./file-code-corner-D4wVIN14.js";import"./loader-circle-M4dSpwJo.js";import"./api-BqYyi_6W.js";import"./folder-open-B5Z4Rqwi.js";import"./folder-B8FMFgll.js";import"./tag-color-picker-hXyskEkf.js";import"./sparkles-C3zaumEt.js";import"./brain-CCDwLMPk.js";import"./chevron-right-B2RzSrvn.js";import"./markdown-editor-DIiQX4im.js";import"./pencil-D-c2mImH.js";import"./trash-2-uGE3_goh.js";import"./confirm-dialog-BcteaQTa.js";import"./index-BOaOR7q9.js";import"./triangle-alert-Bl4My0pG.js";import"./templates-CTw7PwHG.js";import"./plus-B5qSupvz.js";import"./task-row-BCnh4Vrm.js";import"./i18n-labels-xHnVFAyS.js";import"./selectable-icon-Daba8INk.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-or905gcg.js";import"./arrow-left-B9MeDmJ3.js";import"./spinner-BCWhNpHu.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DGw1a3QH.js";import"./use-api-data-BnHkG9Vf.js";import"./useQuery-CVCyXsC5.js";import"./presentation-Bn-JqiEY.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
