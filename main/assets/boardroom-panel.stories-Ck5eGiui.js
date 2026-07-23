import{aX as T}from"./iframe-Jpjsk1jK.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-aOMda4JU.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BLG5sHoI.js";import"./Select-ef7c0426.esm-DDpS8aPt.js";import"./chevron-down-DyZIU6AV.js";import"./check-BOSnNaKG.js";import"./project-tag-B0E2I9hC.js";import"./project-modal-BRFMvcZp.js";import"./export-menu-Do-337Kg.js";import"./client-CU5Lpa-V.js";import"./markdown-preview-CuvqHrl7.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D6A_YPG7.js";import"./copy-D6bd6RVD.js";import"./file-code-corner-CBsuaYiB.js";import"./loader-circle-Cw0JcSUh.js";import"./api-89O6jT8Y.js";import"./folder-open-C_-VH1Xq.js";import"./folder-LqTf1T-m.js";import"./tag-color-picker-Z-hLLyiW.js";import"./sparkles-B3doPOyF.js";import"./brain-DBiDF0MZ.js";import"./chevron-right-BWkmjPYr.js";import"./markdown-editor-B_cXsSmW.js";import"./pencil-BCxRfPAr.js";import"./trash-2-LQ_vtFGp.js";import"./confirm-dialog-fkY-pouz.js";import"./index-uWsVKQga.js";import"./triangle-alert-DDzOcAmH.js";import"./templates-B6M1OYb3.js";import"./plus-C9w213ld.js";import"./task-row-B4VeiAzG.js";import"./blocked-badge-Ci0l_fFY.js";import"./selectable-icon-CFCt6Erh.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Bu4_SAyv.js";import"./arrow-left-CA0y3Dks.js";import"./spinner-CRHY3qeH.js";import"./task-route-D70_7rUP.js";import"./data-refresh-Ccs16SRe.js";import"./use-api-data-DslNFbNc.js";import"./useQuery-BW9a3SUa.js";import"./presentation-DbwrUg38.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
