import{a_ as T}from"./iframe-DQYCurDR.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BNDo08P3.js";import"./preload-helper-Dp1pzeXC.js";import"./index-RhU0ttOv.js";import"./Select-ef7c0426.esm-CsYGENL7.js";import"./chevron-down-Bxyl9xQk.js";import"./check-C7AXBqFX.js";import"./project-tag-CBGyNJwA.js";import"./project-modal-BwgAQEhQ.js";import"./export-menu-U4c-Ce15.js";import"./client-Dac-4Cl6.js";import"./markdown-preview-DJl57lpy.js";import"./index.dom-D_wTd2ti.js";import"./file-text-1jfLDmSQ.js";import"./copy-CdSTNKSi.js";import"./file-code-corner-De2whzbC.js";import"./loader-circle-C0y5ZRTY.js";import"./api-BeVJaIoh.js";import"./folder-open-BPPFB8-g.js";import"./folder-CnMKHgA_.js";import"./tag-color-picker-BzG80ESV.js";import"./sparkles-DMGJvTgB.js";import"./brain-DYJ2OMxE.js";import"./chevron-right-Dl552J6N.js";import"./markdown-editor-DIncZNm1.js";import"./pencil-R_e056PL.js";import"./trash-2-DmAnjfMs.js";import"./confirm-dialog-CfcErPUO.js";import"./index-D98OljXx.js";import"./templates-BodN5NKE.js";import"./plus-2vOSu1Om.js";import"./task-row-C-f3pIRh.js";import"./blocked-badge-BlA8QQ2m.js";import"./selectable-icon-FaaGIlMp.js";import"./hover-expand-button-pK9giuAi.js";import"./index-CBZfEUv9.js";import"./data-refresh-C34n8lAl.js";import"./rotate-ccw-CNd3Kvgi.js";import"./play-oBPkHuHM.js";import"./square-terminal-DaFzxThS.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-BFHAMVsb.js";import"./spinner-BepzN32g.js";import"./task-route-D70_7rUP.js";import"./use-api-data-k2uGBOZS.js";import"./useQuery-BjObCDUB.js";import"./presentation-DfdQVEg8.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
