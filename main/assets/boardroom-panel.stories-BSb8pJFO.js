import{aX as T}from"./iframe-B0E9638w.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-B2_SMvv6.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bv27s9eg.js";import"./Select-ef7c0426.esm-Gg0ser_s.js";import"./chevron-down-Cogw_DS7.js";import"./check-H-Y7sFPy.js";import"./project-tag-j--98bB8.js";import"./project-modal-CaOcptye.js";import"./export-menu-CkSqliYy.js";import"./client-ChTwrvJU.js";import"./markdown-preview-BHIdrKKl.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C-ZxX5lX.js";import"./copy-By0ZLYI2.js";import"./file-code-corner-BfcTvc8t.js";import"./loader-circle-Ds8cDbYd.js";import"./api-PQjXbBA6.js";import"./folder-open-CH7K4vDu.js";import"./folder-BhWZfr8L.js";import"./tag-color-picker-DLQ0ESVP.js";import"./sparkles-j1TVJfas.js";import"./brain-CpAfsuTP.js";import"./chevron-right-kU_5A1Zw.js";import"./markdown-editor-a4HEgOND.js";import"./pencil-CmbZLT0d.js";import"./trash-2-BmFmshqc.js";import"./confirm-dialog-TyptWHN8.js";import"./index-DoiGhrhv.js";import"./triangle-alert-3wfMb6gu.js";import"./templates-B6M1OYb3.js";import"./plus-DzB4Nw_1.js";import"./task-row-CGHkRiCh.js";import"./blocked-badge-DwDQPdah.js";import"./selectable-icon-CYcoiR3U.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Bbg93rs6.js";import"./arrow-left-Bl3q63tt.js";import"./spinner-uALqxZmY.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BYrXCb91.js";import"./use-api-data-ByIfLh_f.js";import"./useQuery-CGzpCi_Y.js";import"./presentation-CFtcfGPc.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
