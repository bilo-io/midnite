import{aX as T}from"./iframe-B_2RvTEd.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Wd59qjlD.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Dh5MDh54.js";import"./Select-ef7c0426.esm-BQ_X5SLM.js";import"./chevron-down-cvryCvCk.js";import"./check-Dv9jf2XB.js";import"./project-tag-DU92RLr-.js";import"./project-modal-DuZp_xHW.js";import"./export-menu-DvRA99J0.js";import"./client-D0BKludJ.js";import"./markdown-preview-CCkJ42uP.js";import"./index.dom-D_wTd2ti.js";import"./file-text-MLSAkFVA.js";import"./copy-K040GgSi.js";import"./file-code-corner-DE3gstaI.js";import"./loader-circle-CD9RvoZo.js";import"./api-aKWrzv8l.js";import"./folder-open-BPfWYhpc.js";import"./folder-CWoi7A3E.js";import"./tag-color-picker-DtLk3ooL.js";import"./sparkles-B81vBA_U.js";import"./brain-Cxzw3liw.js";import"./chevron-right-atPQfu3g.js";import"./markdown-editor-fGkXsoQs.js";import"./pencil-izyl7x48.js";import"./trash-2-BZStD94B.js";import"./confirm-dialog-XIkbh3fH.js";import"./index-CpgFpTdy.js";import"./triangle-alert-D9e7BBJL.js";import"./templates-B6M1OYb3.js";import"./plus-c0XwPCp-.js";import"./task-row-B1pK00KL.js";import"./blocked-badge-CUrgGrMN.js";import"./selectable-icon-D9EySEFx.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-B4GyznGO.js";import"./arrow-left-BBvM5WWO.js";import"./spinner-Ds_uUGCl.js";import"./task-route-D70_7rUP.js";import"./data-refresh-_exQRBhX.js";import"./use-api-data-BNq9-JNO.js";import"./useQuery-DmTwmtFT.js";import"./presentation-CZfnY2Ze.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
