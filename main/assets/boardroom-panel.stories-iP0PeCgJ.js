import{n as T}from"./iframe-BlMonxM8.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-DbOm_JqN.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Bi2UEYrH.js";import"./index-a9ZvxDeA.js";import"./check-mNrV4FD-.js";import"./project-tag-BBqu2Shw.js";import"./inbound-C72cBbSB.js";import"./project-modal-wXiRUERw.js";import"./export-menu-BrRb6qwR.js";import"./client-ECf5FXjt.js";import"./markdown-preview-Ba5Tm7kj.js";import"./file-text-DzVKEyXj.js";import"./copy-DYam_sG5.js";import"./loader-circle-DSnQLmfL.js";import"./api-BCjkhNtG.js";import"./folder-open-lTMD1gG3.js";import"./folder-C9tqOPkm.js";import"./tag-color-picker-BfntInl_.js";import"./source-list-editor-cbA2zyug.js";import"./confirm-dialog-BAEYofuU.js";import"./triangle-alert-CBjfH6DE.js";import"./source-icon-BC-ej3uc.js";import"./globe-BNkRT7Gj.js";import"./sticky-note-CJ-3kMOa.js";import"./plus-DoTM-8mL.js";import"./external-link-tOQDeMoc.js";import"./task-row-CP-syWIa.js";import"./blocked-badge-D_zy0F1m.js";import"./selectable-icon-C4I8nSeF.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-DRdP3Q_h.js";import"./pencil-CGU5U0XO.js";import"./trash-2-Ce9sYDko.js";import"./refresh-cw-B0GFQVvY.js";import"./index-DJcqkVou.js";import"./lightbulb-DHysT4O5.js";import"./templates-B6M1OYb3.js";import"./sparkles-lLkfV5Rv.js";import"./brain-77GxoPYA.js";import"./chevron-right-C14gP1Bu.js";import"./spinner-cm_vHU7M.js";import"./data-refresh-C0Im5X6G.js";import"./useQuery-C-j0o4i-.js";import"./presentation-RkXoDE1J.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
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
    json: []
  }, {
    match: '/tasks',
    json: []
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
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,Tt as __namedExportsOrder,Bt as default};
