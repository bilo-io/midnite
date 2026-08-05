import{a_ as T}from"./iframe-CzW4mhwb.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-B4n-p2sj.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CgQBr1Pd.js";import"./Select-ef7c0426.esm-DMZqecfI.js";import"./chevron-down-DQyiikrp.js";import"./check-C_AEmsFb.js";import"./project-tag-BG6ktr-W.js";import"./project-modal-7JUu6ACU.js";import"./export-menu-C8PXYN_w.js";import"./client-B7WR-q-x.js";import"./markdown-preview-BVltBt-C.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D0pe4I-k.js";import"./copy-CnLg691-.js";import"./file-code-corner-B7vSv4uo.js";import"./loader-circle-DhmxoIpP.js";import"./api-D5zsh0uM.js";import"./folder-open-DXa3-OsI.js";import"./folder-DNrnCBO0.js";import"./tag-color-picker-DUL_LuF_.js";import"./sparkles-BZKOPIPL.js";import"./brain-KdhMDYv4.js";import"./chevron-right-Dk_NFXuc.js";import"./markdown-editor-DnhMjTK0.js";import"./pencil-D1Dyjxjd.js";import"./trash-2-BRS-ADtV.js";import"./confirm-dialog-BUkuYmp6.js";import"./templates-BZ9Wa5el.js";import"./project-template-labels-U69YeShX.js";import"./plus-O2gFqE6B.js";import"./task-row-PJ9bTd64.js";import"./blocked-badge-CYzhL4qp.js";import"./selectable-icon-gKQxA532.js";import"./hover-expand-button-BOrY3n9g.js";import"./index-CKsTKQJa.js";import"./data-refresh-CEKX9T89.js";import"./rotate-ccw-C9mJR1Lc.js";import"./play-BcL9fGhQ.js";import"./square-terminal-BQaWLVHK.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-C4RosFBs.js";import"./spinner-C37ILLly.js";import"./task-route-D70_7rUP.js";import"./use-api-data-7EDy8PCg.js";import"./useQuery-B_xDZICD.js";import"./presentation-CtY179D9.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
