import{aU as T}from"./iframe-DEiWDkYx.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Cef_ok3A.js";import"./preload-helper-Dp1pzeXC.js";import"./index-_jGqRVQb.js";import"./Select-ef7c0426.esm-DaSrsoCS.js";import"./chevron-down-BESpXNuf.js";import"./check-u22-M-Oh.js";import"./project-tag-3JAXHW0l.js";import"./project-modal-Cvq8TotJ.js";import"./export-menu-DrF4_zFC.js";import"./client-2UTqC7J6.js";import"./markdown-preview-Cl8U4f8z.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D76kGz1D.js";import"./copy-CMcG4qZN.js";import"./file-code-corner-BnkCFIms.js";import"./loader-circle-CkVCXTHI.js";import"./api-B48H8P2O.js";import"./folder-open-BlVHYhye.js";import"./folder-CNj9gZEi.js";import"./tag-color-picker-CP-OWk6l.js";import"./sparkles-C3l59qbn.js";import"./brain-DkGHAz1x.js";import"./chevron-right-D_Qefsjl.js";import"./markdown-editor-BJc_rxtE.js";import"./pencil-BXHKMJYg.js";import"./trash-2-D3oQHikl.js";import"./confirm-dialog-otkATFfq.js";import"./index-Clm5FfWQ.js";import"./triangle-alert-DP3-beFX.js";import"./templates-B6M1OYb3.js";import"./plus-DZXpCxGX.js";import"./task-row-BD3d4KIC.js";import"./i18n-labels-BG71H2El.js";import"./selectable-icon-DBWtwc1g.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CGmPwJQx.js";import"./arrow-left-RZMrx_kI.js";import"./spinner-CP6uVykp.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BY_d29Ze.js";import"./use-api-data-CuBZ6LDP.js";import"./useQuery-CSEMPWXq.js";import"./presentation-CuC4GTyP.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
