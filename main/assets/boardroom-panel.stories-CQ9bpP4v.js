import{aX as T}from"./iframe-2OGF1UZZ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-AqBO3E0g.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DMeFtEgl.js";import"./Select-ef7c0426.esm-DRnXpgYL.js";import"./chevron-down-BwSNIjGu.js";import"./check-Bykaflmc.js";import"./project-tag-BB-Alg7I.js";import"./project-modal-CktnVZIY.js";import"./export-menu-CLe4r0rd.js";import"./client-B_nUpCIh.js";import"./markdown-preview-B1UIFFhw.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DMdWZVUW.js";import"./copy-DpiuAjBB.js";import"./file-code-corner-Cmg7ZsDf.js";import"./loader-circle-Dfi1e4dD.js";import"./api-CwbHc1_y.js";import"./folder-open-DuDJ49To.js";import"./folder-kljSWZmb.js";import"./tag-color-picker-Dhauy5eu.js";import"./sparkles-BN8C-9QN.js";import"./brain-ColODwLz.js";import"./chevron-right-DaB_C7iG.js";import"./markdown-editor-BEbxDXKs.js";import"./pencil-sJKTOYtO.js";import"./trash-2-3SpWNrMf.js";import"./confirm-dialog-CeMjIeWC.js";import"./index-BMuGDce6.js";import"./triangle-alert-BX87LVRj.js";import"./templates-B6M1OYb3.js";import"./plus--d-063ai.js";import"./task-row-1wlGDakh.js";import"./blocked-badge-BXc9ck8y.js";import"./selectable-icon-DktusrON.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DC-zy7_X.js";import"./arrow-left-C09wMVzr.js";import"./spinner-tRhKSqXb.js";import"./task-route-D70_7rUP.js";import"./data-refresh-c8hhkNui.js";import"./use-api-data-DYI3k0oU.js";import"./useQuery-C-OaMkhB.js";import"./presentation-DRjv5NuS.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
