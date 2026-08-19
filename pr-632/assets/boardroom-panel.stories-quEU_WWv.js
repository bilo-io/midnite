import{b0 as T}from"./iframe-7xdydTgH.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-ZS0EA5Tm.js";import"./preload-helper-Dp1pzeXC.js";import"./index-dCETeEyU.js";import"./Select-ef7c0426.esm-D63TH_iW.js";import"./chevron-down-D7WAugll.js";import"./check-38aLmfVG.js";import"./project-tag-DT3Sd9Ys.js";import"./project-modal-C-3M8jDp.js";import"./export-menu-D_25Hc7s.js";import"./client-Cu3nuY3P.js";import"./markdown-preview-CtD2EQOA.js";import"./index.dom-D_wTd2ti.js";import"./copy-CWufTt25.js";import"./file-code-corner-Dpxg4P3t.js";import"./file-text-kw9scVGo.js";import"./loader-circle-D8jr5t6O.js";import"./api-DFawzJ-3.js";import"./folder-open-qLbUxrgq.js";import"./folder-D_rBjznQ.js";import"./tag-color-picker-_vbWlUrW.js";import"./sparkles-fX_vNheC.js";import"./brain-BTEcTqlY.js";import"./chevron-right-Ba6wtIJm.js";import"./markdown-editor-B0otZJhq.js";import"./pencil-2j83ktw2.js";import"./trash-2-Bj_rYX85.js";import"./confirm-dialog-BBVma7i5.js";import"./templates-BbyHNWs-.js";import"./project-template-labels-BzE73GWp.js";import"./plus-xFQ9mX4z.js";import"./task-row-Clo4Kbpc.js";import"./blocked-badge-DGSws1AT.js";import"./selectable-icon-eaP_sKuN.js";import"./hover-expand-button-DSSgb5uq.js";import"./index-UbqSghmA.js";import"./data-refresh-D0_GIE56.js";import"./rotate-ccw-Doh_5tva.js";import"./play-CrFz0Qdb.js";import"./square-terminal-CZXiTfH_.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DZ19iQ5B.js";import"./spinner-DVZJms6X.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BrPw-eDN.js";import"./useQuery-DatXx1VS.js";import"./presentation-r-M4V8dB.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
