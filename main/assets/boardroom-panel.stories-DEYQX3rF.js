import{aW as T}from"./iframe-BEdWWGYj.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CZ339_Lb.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CytwNYgX.js";import"./Select-ef7c0426.esm-B5QaRMIk.js";import"./chevron-down-Dc3kmHhx.js";import"./check-5j-kyeks.js";import"./project-tag-D-9kaCBe.js";import"./project-modal-flYiJt2A.js";import"./export-menu-DhNbXBY0.js";import"./client-Okh20Bjv.js";import"./markdown-preview-B7iqFVtU.js";import"./index.dom-D_wTd2ti.js";import"./file-text-sKlbnOCh.js";import"./copy-soA_pkYq.js";import"./file-code-corner-yavAeZaZ.js";import"./loader-circle-zC6w6-b1.js";import"./api-DBbyLUCm.js";import"./folder-open-CeA0FIav.js";import"./folder-BM58C2hv.js";import"./tag-color-picker-BGN2tah5.js";import"./sparkles-CmMErN_b.js";import"./brain-BlDA3OZ3.js";import"./chevron-right-moN6BdYd.js";import"./markdown-editor-Da4r5hjr.js";import"./pencil-eyEyi06a.js";import"./trash-2-RaeKF_3u.js";import"./confirm-dialog-D4yPOWc3.js";import"./index-CcfqIhhf.js";import"./triangle-alert-B4Lp8s4i.js";import"./templates-B6M1OYb3.js";import"./plus-D-Xfc9hN.js";import"./task-row-DqsubcUJ.js";import"./i18n-labels-CrBn7t3d.js";import"./selectable-icon-zobkzurG.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Dd3IbT4X.js";import"./arrow-left-CJtd5lyD.js";import"./spinner-wWLmcVpW.js";import"./task-route-D70_7rUP.js";import"./data-refresh-kSja-sQX.js";import"./use-api-data-18o_S3px.js";import"./useQuery-h871Vjwc.js";import"./presentation-BX4jkHil.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
