import{aX as T}from"./iframe-CKInbcHB.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BPVZCcIa.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DN3V5uf0.js";import"./Select-ef7c0426.esm-DyFHFFNF.js";import"./chevron-down-CTIxbAZJ.js";import"./check-Bft_2GDg.js";import"./project-tag-OW-HDJqs.js";import"./project-modal-CTI6PyjB.js";import"./export-menu-dK4XU3-M.js";import"./client-BnFDP2Bh.js";import"./markdown-preview-D8wi_jo4.js";import"./index.dom-D_wTd2ti.js";import"./file-text-112MgeP7.js";import"./copy-BedTfkbU.js";import"./file-code-corner-Chl3iL5J.js";import"./loader-circle-DTayKdGo.js";import"./api-Biv6lcxB.js";import"./folder-open-D7-33kEi.js";import"./folder-DhU6ubQB.js";import"./tag-color-picker-OJsxIgme.js";import"./sparkles-BzZ4pJEY.js";import"./brain-CHFsUT8w.js";import"./chevron-right-C3Mn_FoP.js";import"./markdown-editor-BImO42qc.js";import"./pencil-6dXZwOJP.js";import"./trash-2-DtXMBSOK.js";import"./confirm-dialog-LCRZamtX.js";import"./index-Cf2x9pEx.js";import"./triangle-alert-BGAGuAWR.js";import"./templates-B6M1OYb3.js";import"./plus-BGLa6PYr.js";import"./task-row-BTDOZNjC.js";import"./i18n-labels-DDCpmWet.js";import"./selectable-icon-CYRrTk2L.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-K2_M9X4f.js";import"./arrow-left-CoWjVtHK.js";import"./spinner-BYJEiv5A.js";import"./task-route-D70_7rUP.js";import"./data-refresh-Rk3pvxek.js";import"./use-api-data-_1Ti9k13.js";import"./useQuery-CcxJrPHi.js";import"./presentation-Dq9rPCie.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
