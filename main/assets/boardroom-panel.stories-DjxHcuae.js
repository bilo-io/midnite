import{n as T}from"./iframe-ittfSASu.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-D5_hEe1r.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-AI1R9juX.js";import"./index-DGcqDc3J.js";import"./check-C_ajYtuI.js";import"./project-tag-BfBumwR9.js";import"./inbound-Cpdtk9h4.js";import"./project-modal-iPw1OeGt.js";import"./export-menu-ZegaGtr6.js";import"./client-DWSAWPAE.js";import"./markdown-preview-Dt3hQkiT.js";import"./index.dom-D_wTd2ti.js";import"./file-text-fh1ED7Tg.js";import"./copy-DNYFv7H_.js";import"./file-code-corner-gQ4N7L22.js";import"./loader-circle-BbT0i4MP.js";import"./api-DwMnPyiF.js";import"./folder-open-C9nP3to_.js";import"./folder-BGoaqglz.js";import"./tag-color-picker-CKekx2L6.js";import"./source-list-editor-CioqssvP.js";import"./core.esm-CskbOMYP.js";import"./source-icon-Cc3oK9uu.js";import"./globe-t5sSyGA4.js";import"./sticky-note-Bh4pQvY7.js";import"./plus-COf8PEIL.js";import"./external-link-voaMXyB0.js";import"./task-row-CceCQ-YN.js";import"./blocked-badge-DXuvp8FP.js";import"./selectable-icon-CLbJY_9V.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-Bip698Ba.js";import"./pencil-CzjSXTrc.js";import"./trash-2-CiMszRqP.js";import"./confirm-dialog-CQpcAWtJ.js";import"./triangle-alert-Z7CtWAfs.js";import"./refresh-cw-DCMzB1CZ.js";import"./index-uvySoyHO.js";import"./lightbulb-BehC4PYw.js";import"./templates-B6M1OYb3.js";import"./sparkles-DExnO58X.js";import"./brain-CQZ34dI1.js";import"./chevron-right-gl5sSsgv.js";import"./spinner-D_sp0ZoZ.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CpchheJt.js";import"./useQuery-Dzjdt4pJ.js";import"./presentation-zV6Bgucm.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const It=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,It as __namedExportsOrder,kt as default};
