import{aW as T}from"./iframe-BzMY9Y6X.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Drez_Z6b.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CAcP-RaK.js";import"./Select-ef7c0426.esm-E6FKUJIQ.js";import"./chevron-down-D9LrDWoa.js";import"./check-D58bRaZL.js";import"./project-tag-Bvt7bHlt.js";import"./project-modal-C13ywuzK.js";import"./export-menu-Cxq0Z8wn.js";import"./client-CYDlIkCs.js";import"./markdown-preview-JeJwZHFs.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C94qaxf3.js";import"./copy-CKawUP4F.js";import"./file-code-corner-C6BgsA93.js";import"./loader-circle-67sbr9EX.js";import"./api-DpRSvDIX.js";import"./folder-open-BN498QqN.js";import"./folder-CGse5Zt9.js";import"./tag-color-picker-C6R0PI52.js";import"./sparkles-D3F3TIxL.js";import"./brain-k0mda7z2.js";import"./chevron-right-C84hCNaC.js";import"./markdown-editor-CdJKlJh0.js";import"./pencil-DGTa15IY.js";import"./trash-2-C23pXbXJ.js";import"./confirm-dialog-COqn1b81.js";import"./index-clMCYKOd.js";import"./triangle-alert-DSWQdKBY.js";import"./templates-B6M1OYb3.js";import"./plus-CDX-x7Jn.js";import"./task-row-B_SU4Ol8.js";import"./i18n-labels-BLZDalCd.js";import"./selectable-icon-BKZceKAU.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-H8BhDRaL.js";import"./arrow-left-BG8KUrv-.js";import"./spinner-BMCtiOrl.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BDEBi9xu.js";import"./use-api-data-L6Mdi665.js";import"./useQuery-BQBN56ht.js";import"./presentation-DJ4tdu0n.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
