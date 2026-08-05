import{a$ as T}from"./iframe-XPm5dhjm.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-TyXp7atq.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BTsRUR3M.js";import"./Select-ef7c0426.esm-CKeNqNZ4.js";import"./chevron-down-BK5giTyQ.js";import"./check-FAIbRrsX.js";import"./project-tag-DM2UaxFS.js";import"./project-modal-DzNzf0jc.js";import"./export-menu-5kT9Ye-x.js";import"./client-CYYMMRbB.js";import"./markdown-preview-9QFSXGvo.js";import"./index.dom-D_wTd2ti.js";import"./copy-BPYRkqZ7.js";import"./file-code-corner-j_moL2h5.js";import"./file-text-BmlgbZir.js";import"./loader-circle-DDpC-7eG.js";import"./api-Bijz-e3A.js";import"./folder-open-D-vwRbS7.js";import"./folder-CiX7Lq1P.js";import"./tag-color-picker-BgLTZur9.js";import"./sparkles-BVFsqmvl.js";import"./brain-DLHl999-.js";import"./chevron-right-Ct8FBCGt.js";import"./markdown-editor-4vsP2Fii.js";import"./pencil-DTXKlYTI.js";import"./trash-2-ZngxfdtH.js";import"./confirm-dialog-D4gen3aF.js";import"./templates-De664jZB.js";import"./project-template-labels-Bhz79kM6.js";import"./plus-Gyv73LtI.js";import"./task-row-5hKNWwyC.js";import"./blocked-badge-CITdoyra.js";import"./selectable-icon-TszLs4da.js";import"./hover-expand-button-BjA5F5DT.js";import"./index-Bj3i4008.js";import"./data-refresh-JQqPjJ5J.js";import"./rotate-ccw-BCgZkGfe.js";import"./play-BFmE2LpZ.js";import"./square-terminal-BmOUTe7a.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CPfe5Oqx.js";import"./spinner-BKXXRgwU.js";import"./task-route-D70_7rUP.js";import"./use-api-data-CKWCzQg4.js";import"./useQuery-D4IrmZeQ.js";import"./presentation-DKv9DAod.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
