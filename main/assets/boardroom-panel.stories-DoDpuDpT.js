import{n as T}from"./iframe-DaFpXuLo.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-B45cSyAv.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-4revDPTH.js";import"./index-BIqGwvxJ.js";import"./check-Dfikfxea.js";import"./project-tag-Bq9dRGyd.js";import"./webhook-Ddo3p-Ag.js";import"./project-modal-DhLI0R1z.js";import"./export-menu-gt7mW7rQ.js";import"./client-D25Qz556.js";import"./markdown-preview-D62BZyaz.js";import"./file-text-CB-qH1qb.js";import"./copy-ql5Ruq47.js";import"./loader-circle-67sVKpFB.js";import"./api-CAvxGH1b.js";import"./folder-open-CtWbke-q.js";import"./folder-Cph98anW.js";import"./tag-color-picker-CFE-KGWe.js";import"./source-list-editor-CtpHi2mv.js";import"./confirm-dialog-BMMha0wM.js";import"./triangle-alert-V-tzDSzj.js";import"./source-icon-WF7duqan.js";import"./globe-Ci6OAo19.js";import"./sticky-note-DQ22UFRB.js";import"./plus-p57Y1lYd.js";import"./external-link-DKZNkqVm.js";import"./task-row-DgIqo2qz.js";import"./blocked-badge-B8OHJ5dg.js";import"./selectable-icon-Ctst60FZ.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-SL8kxFtM.js";import"./pencil-C67ZWaIl.js";import"./trash-2-BzJV2l1C.js";import"./refresh-cw-DvkxuIHG.js";import"./index-XOONAkvl.js";import"./lightbulb-BAvX8ajC.js";import"./templates-B6M1OYb3.js";import"./sparkles-DPucNEKl.js";import"./brain-li9-afg4.js";import"./chevron-right-KEu7gHIl.js";import"./spinner-D7gtaFsX.js";import"./data-refresh-DK8694_s.js";import"./useQuery-zpDdwBSq.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await e.findByText(x.name)).toBeInTheDocument(),await n(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(i=o.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,r as Error,Bt as __namedExportsOrder,wt as default};
