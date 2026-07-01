import{n as T}from"./iframe-C6uDgmxk.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-CpuuQ67m.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CE7gPtle.js";import"./index-DryOYERO.js";import"./check-CF5OJWrz.js";import"./project-tag-Djx7rTbl.js";import"./inbound-C7DsSwT4.js";import"./project-modal-B_YWz_P0.js";import"./export-menu-Cwkqolf7.js";import"./client-CBvuE4Ie.js";import"./markdown-preview-CjVYVb14.js";import"./file-text-BJ691j8X.js";import"./copy-CH9RWOap.js";import"./loader-circle-BKqP9kj1.js";import"./api-BF5NoeS0.js";import"./folder-open-BJI7Fckb.js";import"./folder-DOyjX7YN.js";import"./tag-color-picker-Coz4GNTS.js";import"./source-list-editor-fdti8n_i.js";import"./confirm-dialog-5a-foet0.js";import"./triangle-alert-CmKsWAsO.js";import"./source-icon-DtwiHqM_.js";import"./globe-CHe4pvWC.js";import"./sticky-note-CgOhNO5X.js";import"./plus-DyKmy8YQ.js";import"./external-link-BlktDvm2.js";import"./task-row-pygLUXaR.js";import"./blocked-badge-CQ8Y1Ea_.js";import"./selectable-icon-BfHAuUUM.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-D61ig-17.js";import"./pencil-DmZrwIkM.js";import"./trash-2-Qqqliyo6.js";import"./refresh-cw-Ig30sJgw.js";import"./index-CBLlcddW.js";import"./lightbulb-xAKaDDvG.js";import"./templates-B6M1OYb3.js";import"./sparkles-BAzB6jfi.js";import"./brain-DTlP7Daw.js";import"./chevron-right-Crft2gtY.js";import"./spinner-D7jTjtiJ.js";import"./data-refresh-IZbKLm2n.js";import"./useQuery-B8KZ_ydZ.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await e.findByText(x.name)).toBeInTheDocument(),await n(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await n(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
