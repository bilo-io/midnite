import{a$ as T}from"./iframe-DQb38lZQ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BhtNes29.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DO4yAhDv.js";import"./Select-ef7c0426.esm-BpceUwyK.js";import"./chevron-down-PJHNVAq5.js";import"./check-DSrraw-t.js";import"./project-tag-BoxH58v1.js";import"./project-modal-D1K1Bw0D.js";import"./export-menu-pC2DBNh7.js";import"./client-WbQZimAV.js";import"./markdown-preview-BIqlfSNV.js";import"./index.dom-D_wTd2ti.js";import"./copy-BUrwDEEh.js";import"./file-code-corner-sv_c2hPX.js";import"./file-text-BI1z-NvX.js";import"./loader-circle-CYxtW98j.js";import"./api-DMHn31eB.js";import"./folder-open-Dlp7CC0s.js";import"./folder-BDSdnKG1.js";import"./tag-color-picker-Bcl1LGmm.js";import"./sparkles-CiRq86MQ.js";import"./brain-DS79mDt0.js";import"./chevron-right-C1fXgXpC.js";import"./markdown-editor-ChacX4R2.js";import"./pencil-DAPDYqS7.js";import"./trash-2-C2puJV28.js";import"./confirm-dialog-5oU3ozre.js";import"./templates-B4U7OnKQ.js";import"./project-template-labels-BcO8466v.js";import"./plus-DSr160EL.js";import"./task-row-DvHOBREF.js";import"./blocked-badge-GVeunpKo.js";import"./selectable-icon-B4pEkECc.js";import"./hover-expand-button-B6ra6ymS.js";import"./index-CoRihWUl.js";import"./data-refresh-BZMkQ7Eo.js";import"./rotate-ccw-BZhrfHxG.js";import"./play-BRuMDtsm.js";import"./square-terminal-CsxN38gF.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-sYtiSjlW.js";import"./spinner-BQDbScrr.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BaAOWLx3.js";import"./useQuery-BaYM-nsb.js";import"./presentation-CzuD_Vky.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
